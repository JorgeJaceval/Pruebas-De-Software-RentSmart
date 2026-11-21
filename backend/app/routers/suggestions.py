"""HU-17: authenticated description suggestions; nothing is stored or published automatically."""
from typing import Annotated

from fastapi import APIRouter, Depends

from app.ai import DescriptionProvider, SpaceFacts, SuggestionFailure, provider_from
from app.dependencies import get_current_user
from app.errors import SpaceError
from app.models import User
from app.settings import Settings, get_settings
from app.space_schemas import DescriptionSuggestion, DescriptionSuggestionRequest, SpaceFailure

router = APIRouter(prefix="/spaces", tags=["spaces"])

CATEGORY_LABELS = {
    "meeting_room": "Sala de reuniones",
    "photo_studio": "Estudio fotográfico",
    "multipurpose_room": "Sala multiuso",
}
MANUAL = "Puedes escribir la descripción manualmente."
FAILURES = {
    "unavailable": (503, f"La sugerencia con IA no está disponible en este momento. {MANUAL}"),
    "timeout": (504, f"La IA tardó demasiado en responder. Inténtalo nuevamente. {MANUAL}"),
    "rate_limit": (429, f"Se alcanzó el límite de uso de la IA. Inténtalo más tarde. {MANUAL}"),
    "provider": (502, f"No pudimos generar una sugerencia. Inténtalo nuevamente. {MANUAL}"),
    "unusable": (502, f"La IA no devolvió una descripción utilizable. Inténtalo nuevamente. {MANUAL}"),
}


def get_description_provider(settings: Annotated[Settings, Depends(get_settings)]) -> DescriptionProvider:
    return provider_from(settings)


@router.post(
    "/description-suggestion",
    response_model=DescriptionSuggestion,
    responses={status: {"model": SpaceFailure} for status in (422, 429, 502, 503, 504)},
)
def suggest_description(
    data: DescriptionSuggestionRequest,
    user: Annotated[User, Depends(get_current_user)],
    provider: Annotated[DescriptionProvider, Depends(get_description_provider)],
) -> DescriptionSuggestion:
    facts = SpaceFacts(
        name=data.name, category=CATEGORY_LABELS[data.category], commune=data.commune,
        capacity=data.capacity, conditions=data.conditions, location_reference=data.location_reference,
    )
    try:
        suggestion = provider.suggest(facts)
    except SuggestionFailure as failure:
        status, message = FAILURES[failure.reason]
        raise SpaceError(status, message) from None
    except Exception:
        # An unexpected adapter error must not leak details (or the key) to the browser.
        status, message = FAILURES["provider"]
        raise SpaceError(status, message) from None
    return DescriptionSuggestion(suggestion=suggestion)
