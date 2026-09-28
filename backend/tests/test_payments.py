import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.user import User
from app.models.payment import Plan, Payment, Entitlement, Refund
from app.services.payment_service import PaymentService, BasePaymentGateway, RazorpayGateway, MockPaymentGateway

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
    return session

def cleanup_db(session):
    session.close()
    Base.metadata.drop_all(bind=engine)

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


def test_create_order_and_verify_mock(db_session):
    PaymentService.seed_default_plans(db_session)
    user = db_session.query(User).filter(User.id == 1).first()

    # Create Order for Monthly Plan
    order_data = PaymentService.create_order(
        db=db_session,
        user=user,
        plan_code="pro_monthly"
    )
    assert order_data.order_id.startswith("order_mock_")
    assert order_data.amount == 499.0 # 499 INR
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
    assert result.plan_code == "pro_monthly"

    # Check user entitlement status
    entitlement_info = PaymentService.get_user_entitlement(db_session, user)
    assert entitlement_info.has_active_entitlement is True
    assert entitlement_info.plan_code == "pro_monthly"
    assert (entitlement_info.days_remaining or 0) > 0


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

    # 1. Purchase Monthly Plan
    order_data = PaymentService.create_order(
        db=db_session,
        user=user,
        plan_code="pro_monthly"
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


if __name__ == "__main__":
    tests = [
        ("test_seed_default_plans", test_seed_default_plans),
        ("test_create_order_and_verify_mock", test_create_order_and_verify_mock),
        ("test_lifetime_plan_entitlement", test_lifetime_plan_entitlement),
        ("test_statutory_refund_revocation", test_statutory_refund_revocation),
    ]

    for name, test_fn in tests:
        session = get_fresh_db()
        try:
            print(f"Running {name}...")
            test_fn(session)
            print("PASS")
        finally:
            cleanup_db(session)

    print("\nAll Payment & Entitlement unit tests PASSED successfully!")
