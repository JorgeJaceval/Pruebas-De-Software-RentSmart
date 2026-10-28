"""Guardas del script real con Docker simulado; no representan un deploy al VPS."""

import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[1]
SHA = "1234567890abcdef1234567890abcdef12345678"


class DeployGuards(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="rentsmart-ren84-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.release = self.root / "releases" / f"{SHA}.ABCDEFGH"
        (self.release / "scripts").mkdir(parents=True)
        for name in ("deploy.sh", "verify-deployment.sh"):
            shutil.copyfile(SCRIPTS / name, self.release / "scripts" / name)
        shared = self.root / "shared"
        shared.mkdir()
        self.env_file = shared / ".env"
        self.env_file.write_text("# configuración de prueba, sin secretos reales\n")
        self.env_file.chmod(0o600)
        self.previous = self.root / "releases" / "previous"
        self.previous.mkdir()
        (self.root / "current").symlink_to(self.previous)
        self.trace = self.root / "calls.jsonl"
        binary = self.root / "bin"
        binary.mkdir()
        docker = binary / "docker"
        docker.write_text('''#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
with open(os.environ["DOCKER_TRACE"], "a") as output:
    output.write(json.dumps(args) + "\\n")
failure = os.environ["DOCKER_FAILURE"]
if (failure == "build" and "build" in args
    or failure == "migration" and "run" in args and "migrate" in args
    or failure == "start" and "up" in args and "backend" in args):
    sys.exit(37)
if "ps" in args:
    print(args[-1])
if args[0] == "inspect":
    print("0" * 40 if failure == "revision" else os.environ["RELEASE_SHA"])
''')
        docker.chmod(0o700)
        # Si una guarda permite llegar inesperadamente a HTTP, fallamos sin red.
        curl = binary / "curl"
        curl.write_text("#!/usr/bin/env bash\nexit 65\n")
        curl.chmod(0o700)
        self.environment = {
            **os.environ,
            "PATH": f"{binary}:{os.environ['PATH']}",
            "DOCKER_TRACE": str(self.trace),
        }

    def run_deploy(self, failure):
        result = subprocess.run(
            ["bash", str(self.release / "scripts/deploy.sh"), str(self.root),
             SHA, "https://rentsmart.example.org"],
            env={**self.environment, "DOCKER_FAILURE": failure},
            capture_output=True, text=True, timeout=10,
        )
        calls = [json.loads(line) for line in self.trace.read_text().splitlines()] if self.trace.exists() else []
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertEqual((self.root / "current").resolve(), self.previous)
        return result, calls

    def test_failed_build_never_starts_services(self):
        result, calls = self.run_deploy("build")
        self.assertEqual(result.returncode, 37)
        self.assertFalse(any("up" in call or "run" in call for call in calls))

    def test_failed_migration_never_replaces_application(self):
        result, calls = self.run_deploy("migration")
        self.assertEqual(result.returncode, 37)
        self.assertTrue(any("run" in call and "migrate" in call for call in calls))
        self.assertFalse(any("up" in call and "backend" in call for call in calls))

    def test_failed_healthcheck_preserves_last_verified_release(self):
        result, calls = self.run_deploy("start")
        self.assertEqual(result.returncode, 37)
        self.assertTrue(any("up" in call and "backend" in call for call in calls))

    def test_wrong_container_revision_is_rejected(self):
        result, _ = self.run_deploy("revision")
        self.assertIn("Revisión inesperada", result.stderr)

    def test_readable_secrets_are_rejected_before_docker(self):
        self.env_file.chmod(0o644)
        result, calls = self.run_deploy("none")
        self.assertIn("permisos 600", result.stderr)
        self.assertEqual(calls, [])

    def test_concurrent_deploy_is_rejected_before_docker(self):
        with (self.root / "deploy.lock").open("w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            result, calls = self.run_deploy("none")
        self.assertIn("otro despliegue", result.stderr)
        self.assertEqual(calls, [])


if __name__ == "__main__":
    unittest.main()
