from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# --- Plan Schemas ---
class PlanBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    price_inr: int
    original_price_inr: Optional[int] = None
    billing_interval: str = "one_time"
    duration_days: int = 0
    features: List[str] = []
    is_active: bool = True
    is_popular: bool = False
    badge: Optional[str] = None


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_inr: Optional[int] = None
    original_price_inr: Optional[int] = None
    billing_interval: Optional[str] = None
    duration_days: Optional[int] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_popular: Optional[bool] = None
    badge: Optional[str] = None


class PlanResponse(PlanBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Entitlement Schemas ---
class EntitlementResponse(BaseModel):
    has_active_entitlement: bool
    plan_code: str = "free"
    plan_name: str = "Free Starter"
    status: str = "free"
    is_lifetime: bool = False
    is_admin: bool = False
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    days_remaining: Optional[int] = None
    features: List[str] = []

    class Config:
        from_attributes = True


# --- Payment / Order Schemas ---
class CreateOrderRequest(BaseModel):
    plan_code: str
    consent_terms: bool = Field(True, description="Explicit consent to terms and non-refundable digital purchase policy")


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: float
    currency: str = "INR"
    key_id: Optional[str] = None
    plan_id: int
    plan_code: str
    plan_name: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    provider: str
    is_mock: bool = False


class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: Optional[str] = None
    provider: str = "razorpay"


class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    payment_id: str
    order_id: str
    plan_code: str
    entitlement: EntitlementResponse


# --- Transaction & History Schemas ---
class PaymentHistoryItem(BaseModel):
    id: int
    order_id: Optional[str] = None
    payment_id: Optional[str] = None
    plan_name: Optional[str] = None
    plan_code: Optional[str] = None
    amount: float
    currency: str
    status: str
    payment_method: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentHistoryResponse(BaseModel):
    payments: List[PaymentHistoryItem]


# --- Admin Refund & Entitlement Schemas ---
class RefundRequest(BaseModel):
    payment_id: int
    reason: str = Field(..., min_length=3, description="Statutory reason: duplicate_charge, access_provisioning_failure, material_service_fault, customer_dispute")
    amount: Optional[float] = None
    admin_notes: Optional[str] = None


class RefundResponse(BaseModel):
    success: bool
    message: str
    refund_id: Optional[str] = None
    payment_id: int
    amount: float
    status: str


class AdminGrantEntitlementRequest(BaseModel):
    user_id: int
    plan_code: str
    duration_days: Optional[int] = None
    is_lifetime: bool = False
    notes: Optional[str] = None


class AdminTransactionItem(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    plan_name: str
    plan_code: str
    amount: float
    currency: str
    status: str
    provider: str
    provider_order_id: Optional[str]
    provider_payment_id: Optional[str]
    created_at: datetime
    refunded: bool = False

    class Config:
        from_attributes = True


class AdminTransactionsSummaryResponse(BaseModel):
    total_revenue_inr: float
    total_transactions_count: int
    active_subscribers_count: int
    refunds_count: int
    transactions: List[AdminTransactionItem]
