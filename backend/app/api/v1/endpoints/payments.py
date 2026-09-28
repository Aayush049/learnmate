from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.auth import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.schemas.payment import (
    PlanResponse,
    EntitlementResponse,
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
    PaymentHistoryResponse,
    RefundRequest,
    RefundResponse,
    AdminGrantEntitlementRequest,
    AdminTransactionsSummaryResponse,
)
from app.services.payment_service import PaymentService

router = APIRouter()


@router.get("/plans", response_model=List[PlanResponse])
def get_pricing_plans(db: Session = Depends(get_db)):
    """
    Public endpoint: Get all active pricing plans.
    Zero hardcoding; fetched directly from database.
    """
    plans = PaymentService.get_plans(db)
    return plans


@router.get("/my-entitlement", response_model=EntitlementResponse)
def get_current_user_entitlement(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated endpoint: Get current user's entitlement and subscription status.
    """
    return PaymentService.get_user_entitlement(db, current_user)


@router.post("/create-order", response_model=CreateOrderResponse)
def create_payment_order(
    request_data: CreateOrderRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated endpoint: Create a payment order for the chosen plan.
    PCI DSS Compliant: No card information processed on backend.
    """
    if not request_data.consent_terms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent to terms and refund policy is required to proceed.",
        )

    try:
        order_response = PaymentService.create_order(
            db=db,
            user=current_user,
            plan_code=request_data.plan_code,
        )
        return order_response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment gateway error: {str(e)}",
        )


@router.post("/verify-payment", response_model=VerifyPaymentResponse)
def verify_payment_transaction(
    verification_data: VerifyPaymentRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated endpoint: Verifies HMAC signature of captured payment and grants entitlement.
    """
    try:
        result = PaymentService.verify_payment_and_grant_entitlement(
            db=db,
            user=current_user,
            order_id=verification_data.order_id,
            payment_id=verification_data.payment_id,
            signature=verification_data.signature,
            payment_method="online",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}",
        )


@router.post("/webhook")
async def payment_gateway_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Public webhook endpoint: Handles asynchronous gateway callbacks (payment.captured, payment.failed).
    Verified with HMAC SHA256 signature.
    """
    body = await request.body()
    signature = x_razorpay_signature or ""
    result = PaymentService.process_webhook(db, body, signature)
    return result


@router.get("/history", response_model=PaymentHistoryResponse)
def get_payment_history(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated endpoint: Get logged-in user's billing invoices and payment history.
    """
    payments = PaymentService.get_user_payment_history(db, current_user)
    return {"payments": payments}


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/transactions", response_model=AdminTransactionsSummaryResponse)
def admin_get_transactions_summary(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Admin only: Aggregate transaction summary and subscriber list.
    """
    return PaymentService.admin_get_transactions_summary(db)


@router.post("/admin/refund", response_model=RefundResponse)
def admin_process_refund_endpoint(
    refund_data: RefundRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Admin only: Process a statutory refund and revoke corresponding user entitlement.
    """
    try:
        result = PaymentService.admin_process_refund(
            db=db,
            admin_user=admin_user,
            payment_id=refund_data.payment_id,
            reason=refund_data.reason,
            amount=refund_data.amount,
            admin_notes=refund_data.admin_notes,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Refund failed: {str(e)}",
        )


@router.post("/admin/grant-entitlement", response_model=EntitlementResponse)
def admin_grant_entitlement_endpoint(
    grant_data: AdminGrantEntitlementRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Admin only: Manually grant or extend student entitlement for support / promotion.
    """
    try:
        return PaymentService.admin_grant_entitlement(
            db=db,
            admin_user=admin_user,
            target_user_id=grant_data.user_id,
            plan_code=grant_data.plan_code,
            duration_days=grant_data.duration_days,
            is_lifetime=grant_data.is_lifetime,
            notes=grant_data.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
