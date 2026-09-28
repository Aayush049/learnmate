from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Plan(Base):
    """
    Subscription & Access Plans (Database-driven pricing).
    Zero hardcoding so prices, discounts, and tier features can be adjusted dynamically.
    """
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)                         # e.g. "Free Starter", "Pro Monthly", "Pro Annual", "Lifetime Master"
    code = Column(String, unique=True, index=True, nullable=False) # e.g. "free", "pro_monthly", "pro_annual", "lifetime"
    description = Column(Text, nullable=True)
    price_inr = Column(Integer, default=0, nullable=False)        # In whole INR (e.g. 0, 499, 1499, 2999)
    original_price_inr = Column(Integer, nullable=True)           # Strikethrough display price (e.g. 999, 2999, 5999)
    billing_interval = Column(String, default="one_time")         # "free", "monthly", "annual", "lifetime", "one_time"
    duration_days = Column(Integer, default=0)                    # e.g. 30, 365, 0 (0 = infinite / lifetime)
    features = Column(JSON, default=list)                         # ["Unlimited PYQ Practice", "All Full Mock Tests", "AI Copilot & Tutor", "Weakness Profiling"]
    is_active = Column(Boolean, default=True)
    is_popular = Column(Boolean, default=False)
    badge = Column(String, nullable=True)                         # e.g. "POPULAR", "BEST VALUE", "LIFETIME"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    payments = relationship("Payment", back_populates="plan")
    entitlements = relationship("Entitlement", back_populates="plan")

    def __repr__(self):
        return f"<Plan(id={self.id}, code={self.code}, price_inr={self.price_inr})>"


class Payment(Base):
    """
    Payment transaction record.
    Strict PCI DSS compliance: NO raw card numbers, CVV, or card expiration are stored.
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id", ondelete="SET NULL"), nullable=True, index=True)

    # Gateway Provider Details
    provider = Column(String, default="razorpay", nullable=False) # "razorpay", "cashfree", "payu", "mock"
    provider_order_id = Column(String, unique=True, index=True, nullable=True)
    provider_payment_id = Column(String, unique=True, index=True, nullable=True)
    provider_signature = Column(String, nullable=True)

    # Financial Details
    amount = Column(Float, nullable=False)                        # Amount paid in INR
    currency = Column(String, default="INR", nullable=False)
    status = Column(String, default="created", index=True)        # "created", "pending", "captured", "failed", "refunded"

    # Metadata & Diagnostics
    failure_reason = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)                # "upi", "card", "netbanking", "wallet", "mock"
    payment_metadata = Column(JSON, default=dict)                 # Non-sensitive gateway token & event logs

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="payments")
    plan = relationship("Plan", back_populates="payments")
    entitlements = relationship("Entitlement", back_populates="payment")
    refunds = relationship("Refund", back_populates="payment", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Payment(id={self.id}, user_id={self.user_id}, amount={self.amount}, status={self.status})>"


class Entitlement(Base):
    """
    Server-side User Entitlement & Subscription Gate.
    Verifies user access to commercial/pro content.
    """
    __tablename__ = "entitlements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id", ondelete="SET NULL"), nullable=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id", ondelete="SET NULL"), nullable=True, index=True)

    status = Column(String, default="active", index=True)         # "active", "expired", "revoked", "trial"
    starts_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Null indicates lifetime entitlement
    is_lifetime = Column(Boolean, default=False)
    granted_by = Column(String, default="payment")               # "payment", "admin_manual", "trial", "promo"
    notes = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="entitlements")
    plan = relationship("Plan", back_populates="entitlements")
    payment = relationship("Payment", back_populates="entitlements")

    def __repr__(self):
        return f"<Entitlement(id={self.id}, user_id={self.user_id}, status={self.status}, is_lifetime={self.is_lifetime})>"


class Refund(Base):
    """
    Auditable refund logs and cancellation records.
    """
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    provider_refund_id = Column(String, nullable=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR", nullable=False)
    reason = Column(String, nullable=False)                      # "duplicate_charge", "access_provisioning_failure", "customer_dispute", "admin_goodwill"
    status = Column(String, default="processed", index=True)     # "pending", "processed", "failed"
    admin_notes = Column(Text, nullable=True)
    processed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # Admin User ID

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    payment = relationship("Payment", back_populates="refunds")
    user = relationship("User", foreign_keys=[user_id])
    admin_user = relationship("User", foreign_keys=[processed_by])

    def __repr__(self):
        return f"<Refund(id={self.id}, payment_id={self.payment_id}, amount={self.amount}, status={self.status})>"
