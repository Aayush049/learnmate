import os
import sys
import json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.user import User
from app.models.payment import Plan, Payment, Entitlement, Refund
from app.services.payment_service import (
    PaymentService,
    BasePaymentGateway,
    RazorpayGateway,
    MockPaymentGateway,
    get_payment_gateway,
    _mock_gateway_singleton,
)

# In-memory SQLite for payment service unit tests
engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_fresh_db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    # Seed test users
    user = User(
        id=1,
        email="student@learnmate.in",
        hashed_password="fakehashpassword",
        full_name="Test Student",
        is_active=True,
        is_admin=False
    )
    admin = User(
        id=2,
        email="admin@learnmate.in",
        hashed_password="fakehashpassword",
        full_name="Admin User",
        is_active=True,
        is_admin=True
    )
    session.add_all([user, admin])
    session.commit()
    _mock_gateway_singleton.reset_mock_data()
    return session

def cleanup_db(session):
    session.close()
    Base.metadata.drop_all(bind=engine)
    _mock_gateway_singleton.reset_mock_data()

@pytest.fixture
def db_session():
    session = get_fresh_db()
    try:
        yield session
    finally:
        cleanup_db(session)


def test_seed_default_plans(db_session):
    plans = PaymentService.seed_default_plans(db_session)
    assert len(plans) >= 4
    plan_codes = [p.code for p in plans]
    assert "free" in plan_codes
    assert "pro_monthly" in plan_codes
    assert "pro_annual" in plan_codes
    assert "lifetime" in plan_codes

    # Verify only active V1 plans are returned by get_plans
    active_plans = PaymentService.get_plans(db_session)
    assert len(active_plans) == 1
    assert active_plans[0].code == "lifetime"
    assert active_plans[0].is_active is True
    assert active_plans[0].price_inr == 2999


def test_inactive_plan_rejection(db_session):
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    with pytest.raises(ValueError) as excinfo:
        PaymentService.create_order(
            db=db_session,
            user=user,
            plan_code="pro_monthly"
        )
    assert "currently inactive" in str(excinfo.value)


def test_create_order_and_verify_lifetime_mock(db_session):
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    # Create Order for V1 Lifetime Plan
    order_data = PaymentService.create_order(
        db=db_session,
        user=user,
        plan_code="lifetime"
    )
    assert order_data.order_id.startswith("order_mock_")
    assert order_data.amount == 2999.0 # 2999 INR
    assert order_data.is_mock is True

    # Verify Mock Payment
    result = PaymentService.verify_payment_and_grant_entitlement(
        db=db_session,
        user=user,
        order_id=order_data.order_id,
        payment_id="pay_mock_12345",
        signature="mock_valid_signature"
    )

    assert result.success is True
    assert result.entitlement.has_active_entitlement is True
    assert result.plan_code == "lifetime"
    assert result.entitlement.is_lifetime is True

    # Check user entitlement status
    entitlement_info = PaymentService.get_user_entitlement(db_session, user)
    assert entitlement_info.has_active_entitlement is True
    assert entitlement_info.plan_code == "lifetime"
    assert entitlement_info.is_lifetime is True
    assert entitlement_info.expires_at is None


def test_lifetime_plan_entitlement(db_session):
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    order_data = PaymentService.create_order(
        db=db_session,
        user=user,
        plan_code="lifetime"
    )

    result = PaymentService.verify_payment_and_grant_entitlement(
        db=db_session,
        user=user,
        order_id=order_data.order_id,
        payment_id="pay_mock_lifetime_999",
        signature="mock_valid_signature"
    )

    assert result.success is True
    entitlement_info = PaymentService.get_user_entitlement(db_session, user)
    assert entitlement_info.has_active_entitlement is True
    assert entitlement_info.is_lifetime is True


def test_statutory_refund_revocation(db_session):
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()
    admin = db_session.query(User).filter(User.id == 2).first()

    # 1. Purchase Lifetime Plan
    order_data = PaymentService.create_order(
        db=db_session,
        user=user,
        plan_code="lifetime"
    )
    PaymentService.verify_payment_and_grant_entitlement(
        db=db_session,
        user=user,
        order_id=order_data.order_id,
        payment_id="pay_mock_to_refund",
        signature="mock_valid_signature"
    )

    # Verify active
    status_before = PaymentService.get_user_entitlement(db_session, user)
    assert status_before.has_active_entitlement is True

    # 2. Find Payment ID
    payment = db_session.query(Payment).filter(Payment.provider_order_id == order_data.order_id).first()
    assert payment is not None

    # 3. Process Refund by Admin
    refund_res = PaymentService.admin_process_refund(
        db=db_session,
        admin_user=admin,
        payment_id=payment.id,
        reason="Duplicate Transaction Charge"
    )

    assert refund_res["success"] is True
    assert refund_res["status"] == "processed"
    assert payment.status == "refunded"

    # 4. Verify Entitlement Revoked
    status_after = PaymentService.get_user_entitlement(db_session, user)
    assert status_after.has_active_entitlement is False


# ==================== 11 AUTHORITATIVE RECONCILIATION & SECURITY TESTS ====================

def test_successful_manual_verification(db_session):
    """1. Valid order and captured payment ID activates lifetime access"""
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    order_data = PaymentService.create_order(db=db_session, user=user, plan_code="lifetime")

    # Mock gateway holds a captured payment matching this order
    gateway = get_payment_gateway()
    gateway.register_mock_payment({
        "id": "pay_test_success_1",
        "order_id": order_data.order_id,
        "amount": 299900,
        "currency": "INR",
        "status": "captured",
        "method": "upi",
    })

    result = PaymentService.verify_hosted_payment(
        db=db_session,
        user=user,
        order_id=order_data.order_id,
        payment_id="pay_test_success_1"
    )

    assert result.success is True
    assert result.payment_id == "pay_test_success_1"
    assert result.entitlement.has_active_entitlement is True
    assert result.entitlement.is_lifetime is True
    assert result.entitlement.status == "active"

    # Verify database persistence
    payment = db_session.query(Payment).filter(Payment.provider_order_id == order_data.order_id).first()
    assert payment.status == "captured"
    assert payment.provider_payment_id == "pay_test_success_1"


def test_payment_id_does_not_belong_to_order(db_session):
    """2. Mismatched order_id in payment data is rejected"""
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    order_data = PaymentService.create_order(db=db_session, user=user, plan_code="lifetime")

    gateway = get_payment_gateway()
    gateway.register_mock_payment({
        "id": "pay_test_mismatch",
        "order_id": "order_foreign_other_order_999",
        "amount": 299900,
        "currency": "INR",
        "status": "captured",
        "method": "card",
    })

    with pytest.raises(ValueError) as excinfo:
        PaymentService.verify_hosted_payment(
            db=db_session,
            user=user,
            order_id=order_data.order_id,
            payment_id="pay_test_mismatch"
        )
    assert "Payment belongs to order" in str(excinfo.value)

    # Entitlement remains inactive
    entitlement = PaymentService.get_user_entitlement(db_session, user)
    assert entitlement.has_active_entitlement is False


def test_wrong_amount_rejected(db_session):
    """3. Payment for lesser or different amount is rejected"""
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    order_data = PaymentService.create_order(db=db_session, user=user, plan_code="lifetime")

    # Payment of 499 INR instead of 2999 INR
    gateway = get_payment_gateway()
    gateway.register_mock_payment({
        "id": "pay_test_wrong_amt",
        "order_id": order_data.order_id,
        "amount": 49900,
        "currency": "INR",
        "status": "captured",
        "method": "card",
    })

    with pytest.raises(ValueError) as excinfo:
        PaymentService.verify_hosted_payment(
            db=db_session,
            user=user,
            order_id=order_data.order_id,
            payment_id="pay_test_wrong_amt"
        )
    assert "amount mismatch" in str(excinfo.value)

    entitlement = PaymentService.get_user_entitlement(db_session, user)
    assert entitlement.has_active_entitlement is False


def test_wrong_currency_rejected(db_session):
    """4. Non-INR payment is rejected"""
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    order_data = PaymentService.create_order(db=db_session, user=user, plan_code="lifetime")

    gateway = get_payment_gateway()
    gateway.register_mock_payment({
        "id": "pay_test_wrong_curr",
        "order_id": order_data.order_id,
        "amount": 299900,
        "currency": "USD",
        "status": "captured",
        "method": "card",
    })

    with pytest.raises(ValueError) as excinfo:
        PaymentService.verify_hosted_payment(
            db=db_session,
            user=user,
            order_id=order_data.order_id,
            payment_id="pay_test_wrong_curr"
        )
    assert "currency mismatch" in str(excinfo.value)

    entitlement = PaymentService.get_user_entitlement(db_session, user)
    assert entitlement.has_active_entitlement is False


def test_uncaptured_failed_payment_rejected(db_session):
    """5. Status 'failed' or non-captured does not grant entitlement"""
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    order_data = PaymentService.create_order(db=db_session, user=user, plan_code="lifetime")

    gateway = get_payment_gateway()
    gateway.register_mock_payment({
        "id": "pay_test_failed_status",
        "order_id": order_data.order_id,
        "amount": 299900,
        "currency": "INR",
        "status": "failed",
        "method": "card",
    })

    with pytest.raises(ValueError) as excinfo:
        PaymentService.verify_hosted_payment(
            db=db_session,
            user=user,
            order_id=order_data.order_id,
            payment_id="pay_test_failed_status"
        )
    assert "not captured" in str(excinfo.value)

    payment = db_session.query(Payment).filter(Payment.provider_order_id == order_data.order_id).first()
    assert payment.status == "failed"

    entitlement = PaymentService.get_user_entitlement(db_session, user)
    assert entitlement.has_active_entitlement is False


def test_unauthorized_user_verification_rejected(db_session):
    """6. Unauthorized user B cannot verify user A's order"""
    PaymentService.seed_default_plans(db_session)
    user_a = db_session.query(User).filter(User.id == 1).first()

    user_b = User(
        id=3,
        email="other_student@learnmate.in",
        hashed_password="fakehashpassword",
        full_name="Other Student",
        is_active=True,
        is_admin=False
    )
    db_session.add(user_b)
    db_session.commit()

    order_data = PaymentService.create_order(db=db_session, user=user_a, plan_code="lifetime")

    gateway = get_payment_gateway()
    gateway.register_mock_payment({
        "id": "pay_test_user_a",
        "order_id": order_data.order_id,
        "amount": 299900,
        "currency": "INR",
        "status": "captured",
        "method": "upi",
    })

    with pytest.raises(ValueError) as excinfo:
        PaymentService.verify_hosted_payment(
            db=db_session,
            user=user_b,
            order_id=order_data.order_id,
            payment_id="pay_test_user_a"
        )
    assert "Unauthorized" in str(excinfo.value)


def test_webhook_then_manual_verification_idempotent(db_session):
    """7. Webhook activates entitlement first, subsequent manual verification succeeds idempotently with zero duplicate rows"""
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    order_data = PaymentService.create_order(db=db_session, user=user, plan_code="lifetime")

    # 1. Asynchronous Razorpay webhook arrives first
    webhook_body = json.dumps({
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_webhook_first_001",
                    "order_id": order_data.order_id,
                    "amount": 299900,
                    "currency": "INR",
                    "status": "captured",
                    "method": "netbanking",
                }
            }
        }
    }).encode("utf-8")

    res = PaymentService.process_webhook(db_session, webhook_body, "valid_sig")
    assert res["status"] == "processed"

    # Verify user is active with exactly 1 entitlement row
    ent_info = PaymentService.get_user_entitlement(db_session, user)
    assert ent_info.has_active_entitlement is True
    total_entitlements = db_session.query(Entitlement).filter(Entitlement.user_id == user.id).count()
    assert total_entitlements == 1

    # 2. Learner returns to tab and clicks "Verify Payment" / "I've Completed Payment"
    manual_res = PaymentService.verify_hosted_payment(
        db=db_session,
        user=user,
        order_id=order_data.order_id,
        payment_id="pay_webhook_first_001"
    )

    assert manual_res.success is True
    assert manual_res.payment_id == "pay_webhook_first_001"
    assert "already verified" in manual_res.message.lower()

    # Verify still exactly 1 entitlement row in database
    total_entitlements_after = db_session.query(Entitlement).filter(Entitlement.user_id == user.id).count()
    assert total_entitlements_after == 1


def test_manual_then_webhook_verification_idempotent(db_session):
    """8. Manual verification activates first, subsequent webhook handles cleanly without errors or duplicates"""
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    order_data = PaymentService.create_order(db=db_session, user=user, plan_code="lifetime")

    gateway = get_payment_gateway()
    gateway.register_mock_payment({
        "id": "pay_manual_first_002",
        "order_id": order_data.order_id,
        "amount": 299900,
        "currency": "INR",
        "status": "captured",
        "method": "card",
    })

    # 1. Manual verification activates first
    manual_res = PaymentService.verify_hosted_payment(
        db=db_session,
        user=user,
        order_id=order_data.order_id,
        payment_id="pay_manual_first_002"
    )
    assert manual_res.success is True
    assert manual_res.entitlement.has_active_entitlement is True

    ent_count_1 = db_session.query(Entitlement).filter(Entitlement.user_id == user.id).count()
    assert ent_count_1 == 1

    # 2. Subsequent Webhook arrives
    webhook_body = json.dumps({
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_manual_first_002",
                    "order_id": order_data.order_id,
                    "amount": 299900,
                    "currency": "INR",
                    "status": "captured",
                    "method": "card",
                }
            }
        }
    }).encode("utf-8")

    res = PaymentService.process_webhook(db_session, webhook_body, "valid_sig")
    assert res["status"] == "processed"

    ent_count_2 = db_session.query(Entitlement).filter(Entitlement.user_id == user.id).count()
    assert ent_count_2 == 1


def test_repeated_verification_idempotent(db_session):
    """9. Calling verification multiple times returns success without duplicate entitlements"""
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    order_data = PaymentService.create_order(db=db_session, user=user, plan_code="lifetime")

    gateway = get_payment_gateway()
    gateway.register_mock_payment({
        "id": "pay_repeated_003",
        "order_id": order_data.order_id,
        "amount": 299900,
        "currency": "INR",
        "status": "captured",
        "method": "upi",
    })

    # Call 1: Initial verification
    res1 = PaymentService.verify_hosted_payment(db=db_session, user=user, order_id=order_data.order_id, payment_id="pay_repeated_003")
    assert res1.success is True

    # Call 2: Second verification with payment_id
    res2 = PaymentService.verify_hosted_payment(db=db_session, user=user, order_id=order_data.order_id, payment_id="pay_repeated_003")
    assert res2.success is True

    # Call 3: Third verification without payment_id ("Check Payment Status")
    res3 = PaymentService.verify_hosted_payment(db=db_session, user=user, order_id=order_data.order_id)
    assert res3.success is True

    # Confirm exactly 1 active entitlement exists
    total_ent = db_session.query(Entitlement).filter(Entitlement.user_id == user.id, Entitlement.status == "active").count()
    assert total_ent == 1


def test_unpaid_order_remains_unpaid(db_session):
    """10. Check status without payment capture returns error and leaves entitlement inactive"""
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    order_data = PaymentService.create_order(db=db_session, user=user, plan_code="lifetime")

    # Gateway has NO captured payment registered for this order
    gateway = get_payment_gateway()
    gateway.reset_mock_data()

    with pytest.raises(ValueError) as excinfo:
        PaymentService.verify_hosted_payment(
            db=db_session,
            user=user,
            order_id=order_data.order_id
        )
    assert "No captured payment found" in str(excinfo.value)

    payment = db_session.query(Payment).filter(Payment.provider_order_id == order_data.order_id).first()
    assert payment.status == "created"

    entitlement = PaymentService.get_user_entitlement(db_session, user)
    assert entitlement.has_active_entitlement is False


def test_admin_bypass_remains_active(db_session):
    """11. Admins retain master access regardless of purchased entitlements"""
    PaymentService.seed_default_plans(db_session)
    admin = db_session.query(User).filter(User.id == 2).first()
    assert admin.is_admin is True

    entitlement = PaymentService.get_user_entitlement(db_session, admin)
    assert entitlement.has_active_entitlement is True
    assert entitlement.is_admin is True
    assert entitlement.is_lifetime is True
    assert entitlement.status == "active"
    assert entitlement.plan_code == "admin_master"


def test_anti_replay_payment_reuse_rejected(db_session):
    """12. Anti-replay: The same payment ID cannot be reused to capture a second order"""
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    order1 = PaymentService.create_order(db=db_session, user=user, plan_code="lifetime")
    order2 = PaymentService.create_order(db=db_session, user=user, plan_code="lifetime")

    gateway = get_payment_gateway()
    gateway.register_mock_payment({
        "id": "pay_unique_replay_token",
        "order_id": order1.order_id,
        "amount": 299900,
        "currency": "INR",
        "status": "captured",
        "method": "upi",
    })

    # Order 1 successfully verified with this payment ID
    res1 = PaymentService.verify_hosted_payment(db=db_session, user=user, order_id=order1.order_id, payment_id="pay_unique_replay_token")
    assert res1.success is True

    # Order 2 attempts to claim the same payment ID
    gateway.register_mock_payment({
        "id": "pay_unique_replay_token",
        "order_id": order2.order_id,
        "amount": 299900,
        "currency": "INR",
        "status": "captured",
        "method": "upi",
    })

    with pytest.raises(ValueError) as excinfo:
        PaymentService.verify_hosted_payment(db=db_session, user=user, order_id=order2.order_id, payment_id="pay_unique_replay_token")
    assert "already been utilized" in str(excinfo.value)


if __name__ == "__main__":
    tests = [
        ("test_seed_default_plans", test_seed_default_plans),
        ("test_inactive_plan_rejection", test_inactive_plan_rejection),
        ("test_create_order_and_verify_lifetime_mock", test_create_order_and_verify_lifetime_mock),
        ("test_lifetime_plan_entitlement", test_lifetime_plan_entitlement),
        ("test_statutory_refund_revocation", test_statutory_refund_revocation),
        ("test_successful_manual_verification", test_successful_manual_verification),
        ("test_payment_id_does_not_belong_to_order", test_payment_id_does_not_belong_to_order),
        ("test_wrong_amount_rejected", test_wrong_amount_rejected),
        ("test_wrong_currency_rejected", test_wrong_currency_rejected),
        ("test_uncaptured_failed_payment_rejected", test_uncaptured_failed_payment_rejected),
        ("test_unauthorized_user_verification_rejected", test_unauthorized_user_verification_rejected),
        ("test_webhook_then_manual_verification_idempotent", test_webhook_then_manual_verification_idempotent),
        ("test_manual_then_webhook_verification_idempotent", test_manual_then_webhook_verification_idempotent),
        ("test_repeated_verification_idempotent", test_repeated_verification_idempotent),
        ("test_unpaid_order_remains_unpaid", test_unpaid_order_remains_unpaid),
        ("test_admin_bypass_remains_active", test_admin_bypass_remains_active),
        ("test_anti_replay_payment_reuse_rejected", test_anti_replay_payment_reuse_rejected),
    ]

    for name, test_fn in tests:
        session = get_fresh_db()
        try:
            print(f"Running {name}...")
            test_fn(session)
            print("PASS")
        finally:
            cleanup_db(session)

    print("\nAll Payment & Entitlement unit and integration tests PASSED successfully!")
