"""Mensajes y entrega HTTP simulada; no se contacta Slack ni se usan secretos reales."""

from contextlib import redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import notify_slack


FAKE_WEBHOOK = "https://hooks.slack.com/services/unit/test/value"
SHA = "1234567890abcdef1234567890abcdef12345678"


def metadata():
    return {
        "CI_REPOSITORY": "JorgeJaceval/Pruebas-De-Software-RentSmart",
        "CI_SHA": SHA,
        "CI_RUN_ID": "123",
        "CI_RUN_ATTEMPT": "2",
        "CI_BRANCH": "feature/REN-83-notificaciones-slack",
        "CI_EVENT": "pull_request",
        "CI_FAILURE_PROBE": "none",
        "CI_PROBE_EXECUTED": "false",
    }


def results(**changes):
    return {**dict.fromkeys(notify_slack.JOB_NAMES, "success"), "deploy": "skipped", **changes}


class NotificationMessages(unittest.TestCase):
    def test_success_includes_branch_commit_link_and_no_publication(self):
        data = metadata()
        payload = notify_slack.build_payload(results(), data)
        text = payload["blocks"][0]["text"]
        self.assertEqual(text["type"], "plain_text")
        for value in ("ÉXITO", data["CI_BRANCH"], SHA, "omitido (sin publicación)", "intento 2"):
            self.assertIn(value, text["text"])
        self.assertEqual(payload["blocks"][1]["elements"][0]["url"],
                         "https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/123")

    def test_successful_deploy_is_identified(self):
        payload = notify_slack.build_payload(results(deploy="success"), metadata())
        self.assertIn("Despliegue: aprobado", payload["text"])

    def test_failure_of_any_job_is_failure(self):
        for job in notify_slack.JOB_NAMES:
            with self.subTest(job=job):
                states = results(**{job: "failure"})
                self.assertEqual(notify_slack.outcome(states), "failure")
                self.assertIn("FALLO", notify_slack.build_payload(states, metadata())["text"])

    def test_cancelled_pipeline_is_not_success(self):
        self.assertEqual(notify_slack.outcome(results(frontend="cancelled", production="skipped")), "cancelled")

    def test_skipped_core_job_is_incomplete(self):
        self.assertEqual(notify_slack.outcome(results(production="skipped")), "incomplete")

    def test_failure_has_priority_over_cancellation(self):
        self.assertEqual(notify_slack.outcome(results(frontend="failure", backend="cancelled")), "failure")

    def test_controlled_probe_is_explicit(self):
        payload = notify_slack.build_payload(results(frontend="failure"), {**metadata(), "CI_FAILURE_PROBE": "frontend", "CI_PROBE_EXECUTED": "true"})
        self.assertIn("fallo artificial ejecutado", payload["text"])
        earlier_failure = notify_slack.build_payload(results(frontend="failure"), {**metadata(), "CI_FAILURE_PROBE": "frontend"})
        self.assertIn("no ejecutada", earlier_failure["text"])
        self.assertNotIn("fallo artificial", earlier_failure["text"])
        self.assertNotIn("fallo artificial", notify_slack.build_payload(results(), metadata())["text"])

    def test_metadata_is_literal_and_cannot_create_slack_mentions(self):
        branch = 'feature/<!channel>-$(`echo no`)-"&'
        payload = notify_slack.build_payload(results(), {**metadata(), "CI_BRANCH": branch})
        self.assertIn(branch, payload["blocks"][0]["text"]["text"])
        self.assertNotIn("<!channel>", payload["text"])
        self.assertIn("&lt;!channel&gt;", payload["text"])


class NotificationCommand(unittest.TestCase):
    def environment(self):
        states = {name: {"result": state} for name, state in results().items()}
        return {**metadata(), "JOB_RESULTS": json.dumps(states), "SLACK_WEBHOOK_URL": FAKE_WEBHOOK}

    def invoke(self, environment, failure=None):
        output = io.StringIO()
        with patch.object(notify_slack, "_post_payload", side_effect=failure) as post, redirect_stdout(output):
            code = notify_slack.main(environment)
        self.assertNotIn(FAKE_WEBHOOK, output.getvalue())
        return code, output.getvalue(), post

    def test_no_secret_means_no_message_not_false_delivery(self):
        code, output, post = self.invoke({})
        self.assertEqual(code, 0)
        self.assertIn("omitido", output)
        self.assertIn("No se envió", output)
        post.assert_not_called()

    def test_success_is_recorded_in_summary(self):
        with tempfile.TemporaryDirectory() as directory:
            summary = Path(directory) / "summary.md"
            code, _, post = self.invoke({**self.environment(), "GITHUB_STEP_SUMMARY": str(summary)})
            self.assertEqual(code, 0)
            self.assertIn("mensaje enviado", summary.read_text())
            self.assertNotIn(FAKE_WEBHOOK, summary.read_text())
            post.assert_called_once()

    def test_invalid_webhooks_are_rejected_without_request(self):
        for url in ("http://hooks.slack.com/services/unit/test/value", FAKE_WEBHOOK + "?token=secret",
                    FAKE_WEBHOOK + "\n", FAKE_WEBHOOK.replace("hooks.slack.com", "hooks.slack.com.evil.example"),
                    "https://user@hooks.slack.com/services/unit/test/value", "https://other.example/services/unit/test/value"):
            with self.subTest(url=url):
                code, _, post = self.invoke({**self.environment(), "SLACK_WEBHOOK_URL": url})
                self.assertEqual(code, 1)
                post.assert_not_called()

    def test_invalid_metadata_is_rejected_before_request(self):
        for changes in ({"CI_SHA": "bad"}, {"JOB_RESULTS": "{}"}, {"JOB_RESULTS": "null"},
                        {"CI_RUN_ID": "../../elsewhere"}, {"CI_FAILURE_PROBE": "arbitrary"},
                        {"CI_PROBE_EXECUTED": "true"}):
            with self.subTest(changes=changes):
                code, _, post = self.invoke({**self.environment(), **changes})
                self.assertEqual(code, 1)
                post.assert_not_called()

    def test_http_error_does_not_print_secret_or_response_body(self):
        failure = HTTPError(FAKE_WEBHOOK, 503, FAKE_WEBHOOK, {}, None)
        code, output, _ = self.invoke(self.environment(), failure)
        self.assertEqual(code, 1)
        self.assertIn("HTTP 503", output)

    def test_network_error_does_not_print_secret(self):
        code, output, _ = self.invoke(self.environment(), URLError(FAKE_WEBHOOK))
        self.assertEqual(code, 1)
        self.assertIn("conexión", output)

    def test_timeout_is_not_reported_as_delivery(self):
        code, output, _ = self.invoke(self.environment(), TimeoutError(FAKE_WEBHOOK))
        self.assertEqual(code, 1)
        self.assertNotIn("mensaje enviado", output)

    def test_unexpected_response_is_not_reported_as_delivery(self):
        code, output, _ = self.invoke(self.environment(), ValueError(FAKE_WEBHOOK))
        self.assertEqual(code, 1)
        self.assertIn("no se confirmó", output)


class WebhookHTTP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                self.server.received.append((self.headers["Content-Type"], json.loads(self.rfile.read(int(self.headers["Content-Length"])))))
                self.send_response(self.server.response_code)
                if self.server.response_code == 302:
                    self.send_header("Location", "/redirect-target")
                self.end_headers()
                self.wfile.write(self.server.response_body)

            def log_message(self, *args):
                pass

        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, kwargs={"poll_interval": 0.05}, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.thread.join()
        cls.server.server_close()

    def setUp(self):
        self.server.response_code = 200
        self.server.response_body = b"ok"
        self.server.received = []
        self.url = f"http://127.0.0.1:{self.server.server_port}/webhook"
        self.payload = notify_slack.build_payload(results(), metadata())

    def test_json_reaches_local_server(self):
        notify_slack._post_payload(self.url, self.payload)
        self.assertEqual(self.server.received, [("application/json", self.payload)])

    def test_success_requires_expected_response(self):
        self.server.response_body = b"invalid_payload"
        with self.assertRaises(ValueError):
            notify_slack._post_payload(self.url, self.payload)

    def test_failed_delivery_is_not_retried_automatically(self):
        self.server.response_code = 503
        with self.assertRaises(HTTPError) as failure:
            notify_slack._post_payload(self.url, self.payload)
        failure.exception.close()
        self.assertEqual(len(self.server.received), 1)

    def test_redirect_is_not_followed(self):
        self.server.response_code = 302
        with self.assertRaises(HTTPError) as failure:
            notify_slack._post_payload(self.url, self.payload)
        self.assertEqual(failure.exception.code, 302)
        failure.exception.close()
        self.assertEqual(len(self.server.received), 1)


if __name__ == "__main__":
    unittest.main()
