import hmac
import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Tuple
import requests
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.config import settings
from app.models.user import User
from app.models.payment import Plan, Payment, Entitlement, Refund
from app.schemas.payment import (
    EntitlementResponse,
    CreateOrderResponse,
    VerifyPaymentResponse,
    AdminTransactionItem,
    AdminTransactionsSummaryResponse,
)


class BasePaymentGateway:
    """Abstract Payment Gateway Interface"""

    def create_order(self, amount_inr: float, currency: str, receipt: str, notes: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def verify_payment_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        raise NotImplementedError

    def verify_webhook_signature(self, body: bytes, signature: str) -> bool:
        raise NotImplementedError

    def process_refund(self, payment_id: str, amount_inr: float, reason: str) -> Dict[str, Any]:
        raise NotImplementedError


class MockPaymentGateway(BasePaymentGateway):
    """
    Test & Development Sandbox Gateway.
    Allows zero-friction local and CI testing when external gateway credentials are not yet configured.
    """

    def create_order(self, amount_inr: float, currency: str, receipt: str, notes: Dict[str, Any]) -> Dict[str, Any]:
        order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
        return {
            "id": order_id,
            "entity": "order",
            "amount": int(amount_inr * 100),
            "currency": currency,
            "receipt": receipt,
            "status": "created",
            "notes": notes,
            "is_mock": True,
        }

    def verify_payment_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        # In mock mode, any non-empty signature or test string validates
        return bool(order_id and payment_id)

    def verify_webhook_signature(self, body: bytes, signature: str) -> bool:
        return True

    def process_refund(self, payment_id: str, amount_inr: float, reason: str) -> Dict[str, Any]:
        return {
            "id": f"rfnd_mock_{uuid.uuid4().hex[:14]}",
            "entity": "refund",
            "amount": int(amount_inr * 100),
            "currency": "INR",
            "payment_id": payment_id,
            "status": "processed",
            "is_mock": True,
        }


class RazorpayGateway(BasePaymentGateway):
    """
    Production Razorpay India Gateway Implementation.
    Complies strictly with RBI India e-mandate & PCI DSS guidelines.
    Zero raw card data touches LearnMate backend.
    """

    def __init__(self, key_id: str, key_secret: str, webhook_secret: Optional[str] = None):
        self.key_id = key_id
        self.key_secret = key_secret
        self.webhook_secret = webhook_secret or key_secret
        self.base_url = "https://api.razorpay.com/v1"

    def _get_auth(self) -> Tuple[str, str]:
        return (self.key_id, self.key_secret)

    def create_order(self, amount_inr: float, currency: str, receipt: str, notes: Dict[str, Any]) -> Dict[str, Any]:
        # Razorpay takes amount in paise (1 INR = 100 paise)
        amount_paise = int(round(amount_inr * 100))
        payload = {
            "amount": amount_paise,
            "currency": currency,
            "receipt": receipt,
            "notes": notes,
            "payment_capture": 1,
        }
        try:
            resp = requests.post(
                f"{self.base_url}/orders",
                auth=self._get_auth(),
                json=payload,
                timeout=10,
            )
            if resp.status_code not in (200, 201):
                raise Exception(f"Razorpay Order creation failed [{resp.status_code}]: {resp.text}")
            data = resp.json()
            data["is_mock"] = False
            return data
        except requests.RequestException as e:
            raise Exception(f"Failed to communicate with Razorpay: {str(e)}")

    def verify_payment_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        if not signature or not self.key_secret:
            return False
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        generated_signature = hmac.new(
            self.key_secret.encode("utf-8"),
            msg,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(generated_signature, signature)

    def verify_webhook_signature(self, body: bytes, signature: str) -> bool:
        if not signature or not self.webhook_secret:
            return False
        generated_signature = hmac.new(
            self.webhook_secret.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(generated_signature, signature)

    def process_refund(self, payment_id: str, amount_inr: float, reason: str) -> Dict[str, Any]:
        amount_paise = int(round(amount_inr * 100))
        payload = {
            "amount": amount_paise,
            "notes": {"reason": reason},
        }
        try:
            resp = requests.post(
                f"{self.base_url}/payments/{payment_id}/refund",
                auth=self._get_auth(),
                json=payload,
                timeout=10,
            )
            if resp.status_code not in (200, 201):
                raise Exception(f"Razorpay Refund failed [{resp.status_code}]: {resp.text}")
            return resp.json()
        except requests.RequestException as e:
            raise Exception(f"Razorpay Refund connection error: {str(e)}")


def get_payment_gateway() -> BasePaymentGateway:
    """Factory to instantiate configured Payment Gateway provider"""
    key_id = settings.RAZORPAY_KEY_ID
    key_secret = settings.RAZORPAY_KEY_SECRET
    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET

    # If valid Razorpay keys provided, use live/test Razorpay client
    if key_id and key_secret and not key_id.startswith("test_placeholder"):
        return RazorpayGateway(key_id, key_secret, webhook_secret)
    # Default fallback to Mock Sandbox Gateway for offline/dev test runs
    return MockPaymentGateway()


class PaymentService:
    """
    Domain Business Service managing Plans, Orders, Verifications, Entitlements, and Refunds.
    """

    @staticmethod
    def seed_default_plans(db: Session) -> List[Plan]:
        """Seed and maintain standard pricing tiers with V1 Lifetime Pass as active"""
        existing_plans = {p.code: p for p in db.query(Plan).all()}

        default_plans_spec = [
            {
                "name": "SSC JE Civil Full Access",
                "code": "lifetime",
                "description": "One-time payment for lifetime access to the complete SSC JE Civil Engineering preparation suite.",
                "price_inr": 2999,
                "original_price_inr": 5999,
                "billing_interval": "lifetime",
                "duration_days": 0,
                "features": [
                    "Complete SSC JE Civil PYQ Archive (with Detailed Explanations)",
                    "Full-Length Computer-Based (CBT) Mock Tests & Real-Time Ranks",
                    "Subject-Wise & Topic-Wise Dynamic MCQ Practice Engine",
                    "IS 456 & IS 800 Engineering Code Navigator & Formula Sheets",
                    "AI Test-Taking Personality & Topic Weakness Analytics",
                    "Personalized Daily Study Plan Generator & AI Copilot",
                    "Lifetime Access — Single One-Time Payment, Zero Recurring Fees",
                ],
                "is_active": True,
                "is_popular": True,
                "badge": "ONE-TIME LIFETIME PASS",
            },
            {
                "name": "Free Starter",
                "code": "free",
                "description": "Basic introductory access.",
                "price_inr": 0,
                "original_price_inr": 0,
                "billing_interval": "free",
                "duration_days": 0,
                "features": [
                    "Access to Subject Syllabus & Overview",
                ],
                "is_active": False,
                "is_popular": False,
                "badge": None,
            },
            {
                "name": "Pro Monthly",
                "code": "pro_monthly",
                "description": "30-day access (Legacy Tier).",
                "price_inr": 499,
                "original_price_inr": 999,
                "billing_interval": "monthly",
                "duration_days": 30,
                "features": [
                    "30 Days Access",
                ],
                "is_active": False,
                "is_popular": False,
                "badge": None,
            },
            {
                "name": "Pro Annual (Exam Pass)",
                "code": "pro_annual",
                "description": "1-Year access (Legacy Tier).",
                "price_inr": 1499,
                "original_price_inr": 3499,
                "billing_interval": "annual",
                "duration_days": 365,
                "features": [
                    "365 Days Access",
                ],
                "is_active": False,
                "is_popular": False,
                "badge": None,
            },
        ]

        for spec in default_plans_spec:
            code = spec["code"]
            if code in existing_plans:
                plan = existing_plans[code]
                plan.name = spec["name"]
                plan.description = spec["description"]
                plan.price_inr = spec["price_inr"]
                plan.original_price_inr = spec["original_price_inr"]
                plan.billing_interval = spec["billing_interval"]
                plan.duration_days = spec["duration_days"]
                plan.features = spec["features"]
                plan.is_active = spec["is_active"]
                plan.is_popular = spec["is_popular"]
                plan.badge = spec["badge"]
            else:
                new_plan = Plan(**spec)
                db.add(new_plan)

        db.commit()
        return db.query(Plan).order_by(Plan.price_inr.asc()).all()

    @staticmethod
    def get_plans(db: Session) -> List[Plan]:
        PaymentService.seed_default_plans(db)
        return db.query(Plan).filter(Plan.is_active == True).order_by(Plan.price_inr.asc()).all()

    @staticmethod
    def get_user_entitlement(db: Session, user: User) -> EntitlementResponse:
        """
        Determines the current user's entitlement tier.
        Admins receive full master access automatically.
        """
        # 1. Admin Role Bypass
        if user.is_admin:
            return EntitlementResponse(
                has_active_entitlement=True,
                plan_code="admin_master",
                plan_name="Admin Master Access",
                status="active",
                is_lifetime=True,
                is_admin=True,
                starts_at=datetime.now(timezone.utc),
                expires_at=None,
                days_remaining=None,
                features=[
                    "Full Admin Privileges",
                    "All Pro & Master Features Unlocked",
                    "Question Bank Ingestion & Management",
                    "User Administration & Analytics Bypass",
                ],
            )

        # 2. Query Active Entitlements
        now = datetime.now(timezone.utc)
        entitlements = (
            db.query(Entitlement)
            .filter(Entitlement.user_id == user.id, Entitlement.status == "active")
            .order_by(desc(Entitlement.id))
            .all()
        )

        for ent in entitlements:
            # Check if lifetime
            if ent.is_lifetime:
                plan_name = ent.plan.name if ent.plan else "Master Lifetime"
                plan_code = ent.plan.code if ent.plan else "lifetime"
                features = ent.plan.features if ent.plan and ent.plan.features else []
                return EntitlementResponse(
                    has_active_entitlement=True,
                    plan_code=plan_code,
                    plan_name=plan_name,
                    status="active",
                    is_lifetime=True,
                    is_admin=False,
                    starts_at=ent.starts_at,
                    expires_at=None,
                    days_remaining=None,
                    features=features,
                )

            # Check expiration
            if ent.expires_at:
                # Normalize timezone
                exp = ent.expires_at
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)

                if exp > now:
                    days_left = max(0, (exp - now).days)
                    plan_name = ent.plan.name if ent.plan else "Pro Access"
                    plan_code = ent.plan.code if ent.plan else "pro"
                    features = ent.plan.features if ent.plan and ent.plan.features else []
                    return EntitlementResponse(
                        has_active_entitlement=True,
                        plan_code=plan_code,
                        plan_name=plan_name,
                        status="active",
                        is_lifetime=False,
                        is_admin=False,
                        starts_at=ent.starts_at,
                        expires_at=ent.expires_at,
                        days_remaining=days_left,
                        features=features,
                    )
                else:
                    # Mark expired in DB
                    ent.status = "expired"
                    db.commit()

        # 3. Default Free Tier
        free_plan = db.query(Plan).filter(Plan.code == "free").first()
        free_features = free_plan.features if free_plan and free_plan.features else [
            "Access to Subject Syllabus",
            "Limited PYQs",
            "1 Free Mock Test",
        ]
        return EntitlementResponse(
            has_active_entitlement=False,
            plan_code="free",
            plan_name="Free Starter",
            status="free",
            is_lifetime=False,
            is_admin=False,
            starts_at=None,
            expires_at=None,
            days_remaining=0,
            features=free_features,
        )

    @staticmethod
    def create_order(db: Session, user: User, plan_code: str) -> CreateOrderResponse:
        """
        Creates an order with the selected plan via the payment gateway.
        """
        plan = db.query(Plan).filter(Plan.code == plan_code, Plan.is_active == True).first()
        if not plan:
            raise ValueError(f"Plan '{plan_code}' not found or is currently inactive.")

        if plan.price_inr == 0 or plan.code == "free":
            raise ValueError("Free Starter plan does not require checkout.")

        gateway = get_payment_gateway()
        is_mock = isinstance(gateway, MockPaymentGateway)
        provider_name = "mock" if is_mock else "razorpay"

        # Unique transaction receipt identifier
        receipt = f"lm_rcpt_{user.id}_{int(datetime.now(timezone.utc).timestamp())}"
        notes = {
            "user_id": str(user.id),
            "user_email": user.email,
            "plan_code": plan.code,
            "plan_name": plan.name,
            "app": "LEARNMATE",
        }

        # Create order in Payment Gateway
        gw_order = gateway.create_order(
            amount_inr=float(plan.price_inr),
            currency="INR",
            receipt=receipt,
            notes=notes,
        )
        provider_order_id = gw_order["id"]

        # Save initial Payment record in DB (PCI DSS Compliant)
        payment = Payment(
            user_id=user.id,
            plan_id=plan.id,
            provider=provider_name,
            provider_order_id=provider_order_id,
            amount=float(plan.price_inr),
            currency="INR",
            status="created",
            payment_metadata={
                "receipt": receipt,
                "created_via": "api_v1_payments_create_order",
                "is_mock": is_mock,
            },
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

        key_id = settings.RAZORPAY_KEY_ID if not is_mock else "rzp_test_mock_key"

        return CreateOrderResponse(
            order_id=provider_order_id,
            amount=float(plan.price_inr),
            currency="INR",
            key_id=key_id,
            plan_id=plan.id,
            plan_code=plan.code,
            plan_name=plan.name,
            customer_name=user.full_name or "Learner",
            customer_email=user.email,
            customer_phone=user.phone or "",
            provider=provider_name,
            is_mock=is_mock,
        )

    @staticmethod
    def verify_payment_and_grant_entitlement(
        db: Session,
        user: User,
        order_id: str,
        payment_id: str,
        signature: Optional[str] = None,
        payment_method: Optional[str] = "online",
    ) -> VerifyPaymentResponse:
        """
        Verifies payment authenticity via HMAC signature and atomically activates the subscription entitlement.
        """
        payment = db.query(Payment).filter(Payment.provider_order_id == order_id).first()
        if not payment:
            raise ValueError(f"Order '{order_id}' not found in database.")

        if payment.user_id != user.id and not user.is_admin:
            raise ValueError("Unauthorized: Payment order does not belong to the requesting user.")

        # Idempotency Check: if already captured and entitlement exists
        if payment.status == "captured":
            entitlement_info = PaymentService.get_user_entitlement(db, user)
            return VerifyPaymentResponse(
                success=True,
                message="Payment already verified and active.",
                payment_id=payment.provider_payment_id or payment_id,
                order_id=order_id,
                plan_code=payment.plan.code if payment.plan else "pro",
                entitlement=entitlement_info,
            )

        gateway = get_payment_gateway()

        # In non-mock mode, verify HMAC signature
        if not isinstance(gateway, MockPaymentGateway):
            is_valid = gateway.verify_payment_signature(order_id, payment_id, signature or "")
            if not is_valid:
                payment.status = "failed"
                payment.failure_reason = "Signature verification failed"
                db.commit()
                raise ValueError("Payment signature verification failed. Transaction was not captured.")

        # Update Payment Record
        payment.provider_payment_id = payment_id
        payment.provider_signature = signature
        payment.status = "captured"
        payment.payment_method = payment_method or "online"
        payment.payment_metadata = {
            **payment.payment_metadata,
            "captured_at": datetime.now(timezone.utc).isoformat(),
        }

        # Calculate Entitlement Duration
        plan = payment.plan
        now = datetime.now(timezone.utc)
        is_lifetime = (plan.billing_interval == "lifetime" or plan.duration_days == 0)

        # Check existing active entitlement to extend if applicable
        existing_active = (
            db.query(Entitlement)
            .filter(
                Entitlement.user_id == user.id,
                Entitlement.status == "active",
                Entitlement.is_lifetime == False,
            )
            .order_by(desc(Entitlement.expires_at))
            .first()
        )

        if is_lifetime:
            starts_at = now
            expires_at = None
        else:
            duration = timedelta(days=plan.duration_days)
            if existing_active and existing_active.expires_at:
                exp = existing_active.expires_at
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp > now:
                    # Extend from prior expiration
                    starts_at = existing_active.starts_at
                    expires_at = exp + duration
                else:
                    starts_at = now
                    expires_at = now + duration
            else:
                starts_at = now
                expires_at = now + duration

        # Create or update Entitlement
        entitlement = Entitlement(
            user_id=user.id,
            plan_id=plan.id,
            payment_id=payment.id,
            status="active",
            starts_at=starts_at,
            expires_at=expires_at,
            is_lifetime=is_lifetime,
            granted_by="payment",
            notes=f"Subscribed to {plan.name} via order {order_id}",
        )
        db.add(entitlement)
        db.commit()
        db.refresh(entitlement)

        entitlement_info = PaymentService.get_user_entitlement(db, user)

        return VerifyPaymentResponse(
            success=True,
            message="Payment successfully verified! Your subscription is now active.",
            payment_id=payment_id,
            order_id=order_id,
            plan_code=plan.code,
            entitlement=entitlement_info,
        )

    @staticmethod
    def process_webhook(db: Session, body: bytes, signature: str) -> Dict[str, Any]:
        """
        Idempotent Webhook handler for asynchronous Razorpay gateway events.
        """
        gateway = get_payment_gateway()
        if not gateway.verify_webhook_signature(body, signature):
            return {"status": "ignored", "reason": "invalid_signature"}

        try:
            event_data = json.loads(body.decode("utf-8"))
        except Exception:
            return {"status": "error", "reason": "malformed_json"}

        event_name = event_data.get("event")
        payload = event_data.get("payload", {})

        if event_name == "payment.captured":
            payment_entity = payload.get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")
            method = payment_entity.get("method")

            if order_id:
                payment = db.query(Payment).filter(Payment.provider_order_id == order_id).first()
                if payment and payment.status != "captured":
                    user = db.query(User).filter(User.id == payment.user_id).first()
                    if user:
                        PaymentService.verify_payment_and_grant_entitlement(
                            db=db,
                            user=user,
                            order_id=order_id,
                            payment_id=payment_id,
                            signature=None,
                            payment_method=method,
                        )

        elif event_name == "payment.failed":
            payment_entity = payload.get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            error_desc = payment_entity.get("error_description", "Payment failed")
            if order_id:
                payment = db.query(Payment).filter(Payment.provider_order_id == order_id).first()
                if payment:
                    payment.status = "failed"
                    payment.failure_reason = error_desc
                    db.commit()

        return {"status": "processed", "event": event_name}

    @staticmethod
    def get_user_payment_history(db: Session, user: User) -> List[Dict[str, Any]]:
        """Returns the user's personal billing history and transaction invoices"""
        payments = (
            db.query(Payment)
            .filter(Payment.user_id == user.id)
            .order_by(desc(Payment.created_at))
            .all()
        )
        results = []
        for p in payments:
            results.append({
                "id": p.id,
                "order_id": p.provider_order_id,
                "payment_id": p.provider_payment_id,
                "plan_name": p.plan.name if p.plan else "Pro Plan",
                "plan_code": p.plan.code if p.plan else "pro",
                "amount": p.amount,
                "currency": p.currency,
                "status": p.status,
                "payment_method": p.payment_method,
                "created_at": p.created_at,
            })
        return results

    @staticmethod
    def admin_process_refund(
        db: Session,
        admin_user: User,
        payment_id: int,
        reason: str,
        amount: Optional[float] = None,
        admin_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Processes a statutory refund and revokes the associated entitlement.
        """
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise ValueError(f"Payment with ID {payment_id} not found.")

        if payment.status == "refunded":
            raise ValueError("Payment has already been refunded.")

        refund_amount = amount if amount is not None else payment.amount
        gateway = get_payment_gateway()

        # Call gateway refund if live payment
        gw_refund_id = None
        if payment.provider_payment_id and not isinstance(gateway, MockPaymentGateway):
            try:
                gw_resp = gateway.process_refund(
                    payment_id=payment.provider_payment_id,
                    amount_inr=refund_amount,
                    reason=reason,
                )
                gw_refund_id = gw_resp.get("id")
            except Exception as e:
                raise ValueError(f"Gateway refund processing failed: {str(e)}")
        else:
            gw_refund_id = f"rfnd_mock_{uuid.uuid4().hex[:12]}"

        # Mark Payment Refunded
        payment.status = "refunded"
        payment.payment_metadata = {
            **payment.payment_metadata,
            "refunded_at": datetime.now(timezone.utc).isoformat(),
            "refund_reason": reason,
        }

        # Revoke active Entitlements associated with this payment or user
        entitlements = db.query(Entitlement).filter(
            Entitlement.payment_id == payment.id,
            Entitlement.status == "active",
        ).all()
        for ent in entitlements:
            ent.status = "revoked"
            ent.notes = f"Revoked due to refund {gw_refund_id}. Reason: {reason}"

        # Create Refund Record
        refund_record = Refund(
            payment_id=payment.id,
            user_id=payment.user_id,
            provider_refund_id=gw_refund_id,
            amount=refund_amount,
            currency="INR",
            reason=reason,
            status="processed",
            admin_notes=admin_notes,
            processed_by=admin_user.id,
        )
        db.add(refund_record)
        db.commit()

        return {
            "success": True,
            "message": f"Refund of INR {refund_amount} processed successfully. Entitlement revoked.",
            "refund_id": gw_refund_id,
            "payment_id": payment.id,
            "amount": refund_amount,
            "status": "processed",
        }

    @staticmethod
    def admin_grant_entitlement(
        db: Session,
        admin_user: User,
        target_user_id: int,
        plan_code: str,
        duration_days: Optional[int] = None,
        is_lifetime: bool = False,
        notes: Optional[str] = None,
    ) -> EntitlementResponse:
        """
        Allows administrators to manually grant or extend student entitlements for support or promotional access.
        """
        target_user = db.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            raise ValueError(f"Target user with ID {target_user_id} not found.")

        plan = db.query(Plan).filter(Plan.code == plan_code).first()
        if not plan:
            plan = db.query(Plan).filter(Plan.code == "pro_annual").first()

        now = datetime.now(timezone.utc)
        if is_lifetime or (plan and plan.billing_interval == "lifetime"):
            starts_at = now
            expires_at = None
            is_life = True
        else:
            days = duration_days or (plan.duration_days if plan else 365)
            starts_at = now
            expires_at = now + timedelta(days=days)
            is_life = False

        entitlement = Entitlement(
            user_id=target_user.id,
            plan_id=plan.id if plan else None,
            payment_id=None,
            status="active",
            starts_at=starts_at,
            expires_at=expires_at,
            is_lifetime=is_life,
            granted_by="admin_manual",
            notes=notes or f"Manually granted by admin {admin_user.email}",
        )
        db.add(entitlement)
        db.commit()

        return PaymentService.get_user_entitlement(db, target_user)

    @staticmethod
    def admin_get_transactions_summary(db: Session) -> AdminTransactionsSummaryResponse:
        """
        Aggregates financial transactions, total revenue, and subscriber counts for the Admin Dashboard.
        """
        payments = db.query(Payment).order_by(desc(Payment.created_at)).limit(200).all()

        total_revenue = sum(p.amount for p in payments if p.status == "captured")
        total_tx = len(payments)
        refunds_count = db.query(Refund).count()

        active_subscribers = (
            db.query(Entitlement)
            .filter(Entitlement.status == "active")
            .distinct(Entitlement.user_id)
            .count()
        )

        items = []
        for p in payments:
            user = p.user
            items.append(
                AdminTransactionItem(
                    id=p.id,
                    user_id=p.user_id,
                    user_name=user.full_name if user else "Unknown User",
                    user_email=user.email if user else "unknown@learnmate.in",
                    plan_name=p.plan.name if p.plan else "Custom Plan",
                    plan_code=p.plan.code if p.plan else "pro",
                    amount=p.amount,
                    currency=p.currency,
                    status=p.status,
                    provider=p.provider,
                    provider_order_id=p.provider_order_id,
                    provider_payment_id=p.provider_payment_id,
                    created_at=p.created_at,
                    refunded=(p.status == "refunded"),
                )
            )

        return AdminTransactionsSummaryResponse(
            total_revenue_inr=total_revenue,
            total_transactions_count=total_tx,
            active_subscribers_count=active_subscribers,
            refunds_count=refunds_count,
            transactions=items,
        )
