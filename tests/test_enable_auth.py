from unittest.mock import MagicMock

import pytest

from serial_lib.command_runner import CommandRunner


def enable_runner(outputs, prompt="Switch>"):
    session = MagicMock()
    session.read_available.side_effect = outputs
    runner = CommandRunner(session)
    runner.wake_console = MagicMock(return_value=prompt)
    return runner, session


@pytest.mark.parametrize("password", [None, "", "unused-secret"])
def test_password_free_enable_never_sends_password(password):
    runner, session = enable_runner(["Switch#"])
    runner.ensure_priv_exec(password=password)
    assert [c.args[0] for c in session.send_line.call_args_list] == ["en"]


def test_enable_handles_fragmented_ansi_password_and_privileged_prompts():
    runner, session = enable_runner(["\x1b[32mPass", "word:\x1b[0m", "Sw", "itch#"])
    runner.ensure_priv_exec(custom_command="enable", password="secret")
    assert [c.args[0] for c in session.send_line.call_args_list] == ["enable", "secret"]


def test_missing_enable_password_fails_without_blank_submit():
    runner, session = enable_runner(["Password:"])
    with pytest.raises(RuntimeError, match="no password provided"):
        runner.ensure_priv_exec(password="")
    session.send_line.assert_called_once_with("en")


@pytest.mark.parametrize("reply", ["Password:", "Switch>", "Login:", "% Access denied", "% Bad secrets", "% Invalid input detected"])
def test_enable_rejection_does_not_retry_or_expose_password(reply):
    runner, session = enable_runner(["Password:", "echoed-secret\n" + reply])
    with pytest.raises(RuntimeError) as exc:
        runner.ensure_priv_exec(password="echoed-secret")
    assert "echoed-secret" not in str(exc.value)
    assert session.send_line.call_count == 2


def test_already_privileged_does_not_send_enable_or_credentials():
    runner, session = enable_runner([], prompt="Switch#")
    runner.ensure_priv_exec(password="secret")
    session.send_line.assert_not_called()


def test_config_mode_returns_to_privileged_without_authentication():
    runner, session = enable_runner([], prompt="Switch(config)#")
    runner.ensure_priv_exec(password="secret")
    session.send_line.assert_called_once_with("end")


def test_enable_timeout_does_not_expose_echoed_secret(monkeypatch):
    runner, session = enable_runner(["Password:", "echoed-secret"])
    times = iter([0, 0, 1, 1, 17])
    monkeypatch.setattr("serial_lib.command_runner.time.monotonic", lambda: next(times))
    with pytest.raises(TimeoutError, match="enable password or privileged prompt") as exc:
        runner.ensure_priv_exec(password="echoed-secret")
    assert "echoed-secret" not in str(exc.value)


def test_enable_rejects_multiline_password_before_sending():
    runner, session = enable_runner([])
    with pytest.raises(ValueError, match="single line"):
        runner.ensure_priv_exec(password="secret\nconfigure terminal")
    session.send_line.assert_not_called()
