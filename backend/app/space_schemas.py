from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    UrlConstraints,
    ValidationInfo,
    field_validator,
)
from pydantic_core import PydanticCustomError

from app.schemas import require_string


def normalize_space_text(value: Any) -> str:
    value = require_string(value).strip()
    if "\x00" in value:
        raise PydanticCustomError("text_null_byte", "Texto con carácter nulo.")
    return value


HttpsPhoto = Annotated[
    AnyHttpUrl,
    UrlConstraints(allowed_schemes=["https"]),
    BeforeValidator(normalize_space_text),
]


class SpaceCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid", hide_input_in_errors=True, validate_default=True
    )

    name: Annotated[
        str, Field(min_length=5, max_length=80), BeforeValidator(normalize_space_text)
    ]
    description: Annotated[
        str, Field(min_length=20, max_length=1000), BeforeValidator(normalize_space_text)
    ]
    category: Literal["meeting_room", "photo_studio", "multipurpose_room"]
    commune: Annotated[
        str, Field(min_length=2, max_length=80), BeforeValidator(normalize_space_text)
    ]
    location_reference: Annotated[
        str, Field(min_length=5, max_length=150), BeforeValidator(normalize_space_text)
    ]
    capacity: Annotated[int, Field(strict=True, ge=1, le=100)]
    price_per_hour: Annotated[int, Field(strict=True, ge=500, le=500000)]
    conditions: Annotated[
        str, Field(min_length=10, max_length=500), BeforeValidator(normalize_space_text)
    ]
    photos: Annotated[list[HttpsPhoto], Field(min_length=1, max_length=3, strict=True)]
    opening_hour: Annotated[int, Field(strict=True, ge=0, le=23)] = 9
    closing_hour: Annotated[int, Field(strict=True, ge=0, le=23)] = 18

    @field_validator("closing_hour")
    @classmethod
    def closing_after_opening(cls, value: int, info: ValidationInfo) -> int:
        opening_hour = info.data.get("opening_hour")
        if opening_hour is not None and value <= opening_hour:
            raise PydanticCustomError(
                "closing_before_opening", "El cierre debe ser posterior a la apertura."
            )
        return value


class SpaceRead(SpaceCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    is_active: bool


class SpaceFailure(BaseModel):
    detail: str
    errors: dict[str, str]
