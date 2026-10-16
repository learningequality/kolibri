from bench import cli
from click.testing import CliRunner


def test_run_rejects_duplicate_target_names(tmp_path):
    wheel = tmp_path / "kolibri-0.19.4-py2.py3-none-any.whl"
    wheel.write_text("wheel")
    result = CliRunner().invoke(
        cli,
        [
            "run",
            "--baseline",
            f"base={wheel}",
            f"base={wheel}",
            "--suffix",
            "r1",
            "--username",
            "admin",
            "--password",
            "admin",
        ],
    )
    assert result.exit_code == 1
    assert "Duplicate target names: base" in result.output
