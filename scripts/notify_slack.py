"""Notificación de CI/CD de REN-83, con biblioteca estándar y sin imprimir secretos."""

import html
from http.client import HTTPException
import json
import os
from pathlib import Path
import re
import sys
from urllib import error, request


CORE_JOBS = ("frontend", "backend", "quality", "production")
JOB_NAMES = (*CORE_JOBS, "deploy")
STATES = {"success", "failure", "cancelled", "skipped"}
LABELS = {
    "success": "aprobado",
    "failure": "fallido",
    "cancelled": "cancelado",
    "skipped": "omitido",
}
TITLES = {
    "success": "ÉXITO",
    "failure": "FALLO",
    "cancelled": "CANCELADO",
    "incomplete": "INCOMPLETO",
}


def results_from_json(value):
    jobs = json.loads(value)
    results = {name: jobs[name]["result"] for name in JOB_NAMES}
    if any(state not in STATES for state in results.values()):
        raise ValueError("Estado de job inválido")
    return results


def outcome(results):
    if "failure" in results.values():
        return "failure"
    if "cancelled" in results.values():
        return "cancelled"
    if any(results[name] != "success" for name in CORE_JOBS):
        return "incomplete"
    return "success"


def build_payload(results, metadata):
    repository = metadata["CI_REPOSITORY"]
    sha = metadata["CI_SHA"]
    run_id = metadata["CI_RUN_ID"]
    attempt = metadata["CI_RUN_ATTEMPT"]
    branch = metadata["CI_BRANCH"]
    event = metadata["CI_EVENT"]
    probe = metadata.get("CI_FAILURE_PROBE", "none")
    probe_executed = metadata.get("CI_PROBE_EXECUTED", "false")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("Repositorio inválido")
    if not re.fullmatch(r"[a-f0-9]{40}", sha):
        raise ValueError("SHA inválido")
    if not re.fullmatch(r"[1-9][0-9]*", run_id) or not re.fullmatch(r"[1-9][0-9]*", attempt):
        raise ValueError("Identificador de ejecución inválido")
    if not branch or len(branch) > 1024 or event not in {"push", "pull_request", "workflow_dispatch"}:
        raise ValueError("Evento o rama inválidos")
    if probe not in {"none", "frontend", "backend"}:
        raise ValueError("Sonda inválida")
    if probe_executed not in {"true", "false"} or (probe_executed == "true" and (probe == "none" or results[probe] != "failure")):
        raise ValueError("Resultado de sonda inconsistente")
    url = f"https://github.com/{repository}/actions/runs/{run_id}"
    lines = [
        f"RentSmart — CI/CD: {TITLES[outcome(results)]}",
        f"Repositorio: {repository}",
        f"Evento: {event}",
        f"Rama: {branch[:200]}",
        f"Commit: {sha}",
        f"Ejecución: #{run_id}, intento {attempt}",
        *(f"{name}: {LABELS[results[name]]}" for name in CORE_JOBS),
        "Despliegue: " + ("omitido (sin publicación)" if results["deploy"] == "skipped" else LABELS[results["deploy"]]),
    ]
    if probe != "none":
        if probe_executed == "true":
            lines.append(f"Sonda de {probe}: fallo artificial ejecutado después de las pruebas.")
        else:
            lines.append(f"Sonda de {probe}: solicitada, no ejecutada; revisar los fallos o cancelaciones previos.")
    text = "\n".join(lines)
    return {
        # Escapamos también el fallback para evitar interpretar menciones de metadatos.
        "text": html.escape(f"{text}\nEjecución: {url}", quote=False),
        "blocks": [
            {"type": "section", "text": {"type": "plain_text", "text": text}},
            {"type": "actions", "elements": [{
                "type": "button", "text": {"type": "plain_text", "text": "Ver ejecución"},
                "url": url,
            }]},
        ],
        "unfurl_links": False,
        "unfurl_media": False,
    }


def validate_webhook(url):
    if not re.fullmatch(r"https://hooks\.slack\.com/services/[A-Za-z0-9]+/[A-Za-z0-9]+/[A-Za-z0-9]+", url):
        raise ValueError("Webhook inválido")


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _post_payload(url, payload):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    notification = request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    # Sin redirecciones, reintentos automáticos ni TLS deshabilitado.
    with request.build_opener(NoRedirect()).open(notification, timeout=15) as response:
        if response.status != 200 or response.read(1024).strip() != b"ok":
            raise ValueError("Respuesta de Slack inesperada")


def report(message, environment):
    print(message)
    summary = environment.get("GITHUB_STEP_SUMMARY")
    if summary:
        with Path(summary).open("a", encoding="utf-8") as output:
            output.write(f"## Notificación Slack\n\n{message}\n")


def main(environment=None):
    environment = os.environ if environment is None else environment
    webhook = environment.get("SLACK_WEBHOOK_URL", "")
    if not webhook:
        report("Slack: omitido; SLACK_WEBHOOK_URL no está disponible. No se envió ningún mensaje.", environment)
        return 0
    try:
        validate_webhook(webhook)
        results = results_from_json(environment["JOB_RESULTS"])
        payload = build_payload(results, environment)
        _post_payload(webhook, payload)
    except error.HTTPError as failure:
        failure.close()
        report(f"Slack: entrega fallida (HTTP {failure.code}).", environment)
        return 1
    except (error.URLError, OSError, HTTPException):
        report("Slack: entrega fallida por conexión, TLS o tiempo de espera.", environment)
        return 1
    except (ValueError, KeyError, TypeError):
        report("Slack: configuración, metadatos o respuesta inválidos; no se confirmó la entrega.", environment)
        return 1
    report(f"Slack: mensaje enviado; resultado del pipeline: {TITLES[outcome(results)]}.", environment)
    return 0


if __name__ == "__main__":
    sys.exit(main())
