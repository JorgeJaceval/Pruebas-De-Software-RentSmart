"""Ejecutamos la guarda real, no una copia de su lógica ni GitHub/Slack remotos."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "check-quality.sh"


class QualityGate(unittest.TestCase):
    def invoke(self, changes=None, missing=None):
        with tempfile.TemporaryDirectory(prefix="rentsmart-quality-") as directory:
            summary = Path(directory) / "summary.md"
            environment = {**os.environ, "FRONTEND_RESULT": "success", "BACKEND_RESULT": "success",
                           "PRODUCTION_RESULT": "success", "E2E_RESULT": "success",
                           "GITHUB_STEP_SUMMARY": str(summary), **(changes or {})}
            if missing:
                environment.pop(missing)
            result = subprocess.run(["bash", str(SCRIPT)], env=environment,
                                    capture_output=True, text=True, timeout=10)
            return result, summary.read_text() if summary.exists() else ""

    def test_all_checks_must_succeed(self):
        result, summary = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        for job in ("frontend", "backend", "production", "e2e"):
            self.assertIn(f"| {job} | success |", summary)

    def test_failed_cancelled_skipped_or_empty_e2e_blocks_quality(self):
        for state in ("failure", "cancelled", "skipped", ""):
            with self.subTest(state=state):
                result, summary = self.invoke({"E2E_RESULT": state})
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("CI bloqueada", result.stdout)
                self.assertIn(f"| e2e | {state} |", summary)

    def test_smoke_failure_blocks_quality(self):
        result, _ = self.invoke({"PRODUCTION_RESULT": "failure"})
        self.assertNotEqual(result.returncode, 0)

    def test_unit_test_failures_still_block_quality(self):
        for name in ("FRONTEND_RESULT", "BACKEND_RESULT"):
            with self.subTest(name=name):
                result, _ = self.invoke({name: "failure"})
                self.assertNotEqual(result.returncode, 0)

    def test_missing_e2e_result_cannot_pass_quality(self):
        result, _ = self.invoke(missing="E2E_RESULT")
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
