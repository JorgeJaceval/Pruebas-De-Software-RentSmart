import re
from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic_core import PydanticCustomError


class ReservationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    space_id: UUID
    date: date
    start_hour: Annotated[int, Field(strict=True, ge=0, le=22)]
    end_hour: Annotated[int, Field(strict=True, ge=1, le=23)]

    @field_validator("date", mode="before")
    @classmethod
    def calendar_date(cls, value):
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise PydanticCustomError("reservation_date", "Indica una fecha válida YYYY-MM-DD.")
        try:
            return date.fromisoformat(value)
        except ValueError:
            raise PydanticCustomError("reservation_date", "Indica una fecha válida YYYY-MM-DD.") from None


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: Literal["pending", "rejected", "approved", "refunded"]


class ReservationRead(BaseModel):
    id: UUID
    space_id: UUID
    space_name: str
    date: date
    start_hour: int
    end_hour: int
    starts_at: datetime
    ends_at: datetime
    duration_hours: float
    unit_price: int
    total_price: int
    created_at: datetime
    payment_expires_at: datetime
    status: Literal["pending_payment", "paid", "cancelled", "expired", "completed"]
    payment: PaymentRead | None
