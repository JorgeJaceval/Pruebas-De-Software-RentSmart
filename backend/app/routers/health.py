from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.database import get_session

router = APIRouter(prefix="/health", tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "rentsmart-api"


class ReadinessResponse(BaseModel):
    status: Literal["ok"] = "ok"
    database: Literal["connected"] = "connected"


@router.get("", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@router.get("/ready", response_model=ReadinessResponse)
def readiness(session: Annotated[Session, Depends(get_session)]) -> ReadinessResponse:
    try:
        session.exec(select(1)).one()
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La base de datos no está disponible.",
        ) from error
    return ReadinessResponse()
