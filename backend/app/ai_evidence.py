"""HU-17 CA-08: record one real execution of the Gemini integration without exposing the key.

Usage, from `backend/` with GEMINI_API_KEY in the environment, in `backend/.env` or in the root `.env`:

    uv run python -m app.ai_evidence --write ../docs/evidencias/REN-17-ia-real-AAAA-MM-DD.md

It sends a fictitious space (no personal data) through the same adapter the API uses, prints the
date, the requested and responding model and the generated text, and never prints the key.
"""
import argparse
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.ai import GeminiProvider, SpaceFacts, SuggestionFailure, prompt_for

FACTS = SpaceFacts(
    name="Sala de reuniones Los Leones", category="Sala de reuniones", commune="Providencia",
    capacity=10, conditions="Mantener el espacio limpio y dejar la sala ordenada al terminar.",
    location_reference="A dos cuadras del metro Los Leones.",
)


class AiSettings(BaseSettings):
    """Only the AI variables: the evidence never needs database or session secrets."""

    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore")

    gemini_api_key: SecretStr | None = None
    gemini_model: str = Field(default="gemini-flash-lite-latest", pattern=r"^[a-z0-9][a-z0-9.\-]{1,63}$")
    ai_timeout_seconds: float = Field(default=12, gt=0, le=14)


def run(settings: AiSettings, now: datetime | None = None) -> tuple[bool, str]:
    key = settings.gemini_api_key.get_secret_value().strip() if settings.gemini_api_key else ""
    when = (now or datetime.now(ZoneInfo("America/Santiago"))).isoformat(timespec="seconds")
    lines = [
        "# REN-17 — ejecución real de la integración con Gemini (CA-08)", "",
        f"- Fecha: {when} (America/Santiago)",
        f"- Modelo solicitado: `{settings.gemini_model}`",
        f"- Clave: {'configurada en el entorno del backend (no se muestra)' if key else 'NO configurada'}",
    ]
    if not key:
        return False, "\n".join(lines + ["- Resultado: sin clave no hay ejecución real.", ""])
    provider = GeminiProvider(key, settings.gemini_model, settings.ai_timeout_seconds)
    started = time.monotonic()
    try:
        suggestion = provider.suggest(FACTS)
    except SuggestionFailure as failure:
        lines += [f"- Resultado: **fallo** (`{failure.reason}`) tras {time.monotonic() - started:.1f} s.", ""]
        return False, "\n".join(lines)
    lines += [
        f"- Modelo que respondió (`modelVersion`): `{provider.last_model_version or 'no informado'}`",
        f"- Duración: {time.monotonic() - started:.1f} s", "- Resultado: **éxito**", "",
        "## Datos enviados (ficticios)", "", "```", prompt_for(FACTS), "```", "",
        "## Texto generado", "", f"> {suggestion}", "",
        "La sugerencia no se publicó ni se guardó. Revisión humana: comprobar que no agrega servicios,",
        "equipamiento ni características ausentes en los datos.", "",
    ]
    return True, "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--write", type=Path, help="Archivo Markdown donde guardar la evidencia.")
    args = parser.parse_args(argv)
    ok, report = run(AiSettings())
    sys.stdout.write(report)
    if ok and args.write:
        args.write.write_text(report, encoding="utf-8")
        sys.stdout.write(f"\nEvidencia guardada en {args.write}\n")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
