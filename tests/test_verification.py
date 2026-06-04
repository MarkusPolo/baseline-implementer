import os
import sys
import types
from unittest.mock import MagicMock

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

celery_stub = types.ModuleType("celery")


class CeleryStub:
    def __init__(self, *args, **kwargs):
        pass

    def task(self, *args, **kwargs):
        def decorator(func):
            return func

        return decorator


celery_stub.Celery = CeleryStub
sys.modules.setdefault("celery", celery_stub)

sqlalchemy_stub = types.ModuleType("sqlalchemy")
sqlalchemy_orm_stub = types.ModuleType("sqlalchemy.orm")
sqlalchemy_orm_stub.Session = object
sys.modules.setdefault("sqlalchemy", sqlalchemy_stub)
sys.modules.setdefault("sqlalchemy.orm", sqlalchemy_orm_stub)

database_stub = types.ModuleType("backend.database")
database_stub.SessionLocal = MagicMock()
models_stub = types.ModuleType("backend.models")
models_stub.Setting = object
models_stub.JobTarget = object
sys.modules.setdefault("backend.database", database_stub)
sys.modules.setdefault("backend.models", models_stub)

from backend.worker import run_verification_checks


def test_verification_command_renders_variables():
    runner = MagicMock()
    runner.run_show.return_value = "interface Vlan13\n description MGMT\nSwitch#"

    checks = [
        {
            "name": "VLAN interface",
            "command": "show running-config interface vlan {{ vlan_id }}",
            "type": "contains",
            "pattern": "description {{ description }}",
        }
    ]

    results = run_verification_checks(
        runner,
        checks,
        {"vlan_id": "13", "description": "MGMT"},
    )

    runner.run_show.assert_called_once_with("show running-config interface vlan 13")
    assert results[0]["status"] == "pass"


def test_verification_command_render_error_is_reported():
    runner = MagicMock()
    checks = [
        {
            "name": "Missing var",
            "command": "show interface vlan {{ missing_vlan }}",
            "type": "contains",
            "pattern": "anything",
        }
    ]

    results = run_verification_checks(runner, checks, {})

    runner.run_show.assert_not_called()
    assert results[0]["status"] == "error"
    assert "Verification render error" in results[0]["message"]
