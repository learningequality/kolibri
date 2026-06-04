import sys

import click
import loadtest
import pytest
from click.testing import CliRunner
from compare import STATS_FILENAME
from loadtest import cli

UNREACHABLE_SERVER = [
    "--server",
    "http://127.0.0.1:9",
    "--username",
    "admin",
    "--password",
    "admin",
]


def test_rejects_users_not_divisible_by_processes():
    result = CliRunner().invoke(
        cli, [*UNREACHABLE_SERVER, "--users", "50", "--processes", "4", "run"]
    )
    assert result.exit_code == 2
    assert "multiple of --processes" in result.output


def test_rejects_negative_processes():
    result = CliRunner().invoke(
        cli, [*UNREACHABLE_SERVER, "--users", "50", "--processes", "-1", "run"]
    )
    assert result.exit_code == 2
    assert "--processes" in result.output


@pytest.mark.parametrize("command", ["setup", "import-users"])
def test_processes_do_not_constrain_users_outside_run(command):
    result = CliRunner().invoke(
        cli, [*UNREACHABLE_SERVER, "--users", "50", "--processes", "4", command]
    )
    assert "multiple of --processes" not in result.output


def test_stale_stats_do_not_mask_a_failed_locust_run(tmp_path):
    (tmp_path / STATS_FILENAME).write_text("stale")
    with pytest.raises(click.ClickException) as excinfo:
        loadtest._run_locust([sys.executable, "-c", "pass"], {}, str(tmp_path))
    assert f"Locust wrote no {STATS_FILENAME}" in excinfo.value.message
