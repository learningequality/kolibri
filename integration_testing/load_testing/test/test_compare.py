import csv
import json

from compare import compare_runs
from compare import format_delta
from compare import RUN_CONFIG_FILENAME
from compare import STATS_FILENAME

COLUMNS = ("Type", "Name", "Request Count", "Failure Count", "50%", "95%", "99%")


def _write_run(path, rows, config=None):
    path.mkdir()
    with open(path / STATS_FILENAME, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(COLUMNS)
        writer.writerows(rows)
    if config is not None:
        (path / RUN_CONFIG_FILENAME).write_text(json.dumps(config))
    return str(path)


def _config(**overrides):
    return {
        "name": "run",
        "kolibri_version": "0.19.4",
        "users": 50,
        "spawn_rate": 50,
        "duration": "3m",
        "har": "/har_files/lesson_flow_kolibri_0.19.4.har",
        "timestamp": "2026-10-16T00:00:00",
        **overrides,
    }


def _table_labels(output):
    table = output.split("\n\n")[1].splitlines()[1:]
    return [line.split("  ")[0] for line in table]


def test_aggregated_first_then_largest_p95_change(tmp_path):
    base = _write_run(
        tmp_path / "base",
        [
            ("GET", "/a", 10, 0, 100, 200, 300),
            ("GET", "/b", 10, 0, 100, 200, 300),
            ("", "Aggregated", 20, 0, 100, 200, 300),
        ],
    )
    new = _write_run(
        tmp_path / "new",
        [
            ("GET", "/a", 10, 0, 100, 210, 300),
            ("GET", "/b", 10, 0, 100, 100, 300),
            ("", "Aggregated", 20, 0, 100, 150, 300),
        ],
    )
    assert _table_labels(compare_runs(base, new)) == [
        "Aggregated",
        "GET /b",
        "GET /a",
    ]


def test_missing_percentiles_render_as_na(tmp_path):
    base = _write_run(tmp_path / "base", [("GET", "/a", 0, 0, "N/A", "N/A", "N/A")])
    new = _write_run(tmp_path / "new", [("GET", "/a", 5, 0, 100, 200, 300)])
    assert "n/a → 200 (-)" in compare_runs(base, new)


def test_format_delta_with_zero_base_has_no_percentage():
    assert format_delta(0, 5) == "-"
    assert format_delta(100, 150) == "+50.0%"


def test_endpoints_in_one_run_only_are_listed(tmp_path):
    base = _write_run(tmp_path / "base", [("GET", "/gone", 1, 0, 1, 1, 1)])
    new = _write_run(tmp_path / "new", [("POST", "/added", 1, 0, 1, 1, 1)])
    output = compare_runs(base, new).splitlines()
    assert "only in base: GET /gone" in output
    assert "only in new: POST /added" in output


def test_config_differences_are_warned(tmp_path):
    rows = [("GET", "/a", 1, 0, 1, 1, 1)]
    base = _write_run(tmp_path / "base", rows, _config())
    new = _write_run(
        tmp_path / "new",
        rows,
        _config(users=100, har="/elsewhere/lesson_flow_kolibri_0.19.4.har"),
    )
    output = compare_runs(base, new).splitlines()
    assert "WARNING: users differs: 50 vs 100" in output
    assert not any(line.startswith("WARNING: har") for line in output)


def test_locust_option_differences_are_warned(tmp_path):
    rows = [("GET", "/a", 1, 0, 1, 1, 1)]
    base = _write_run(
        tmp_path / "base", rows, _config(processes=0, max_retries=3, retry_delay=5)
    )
    new = _write_run(
        tmp_path / "new", rows, _config(processes=4, max_retries=0, retry_delay=1)
    )
    output = compare_runs(base, new).splitlines()
    assert "WARNING: processes differs: 0 vs 4" in output
    assert "WARNING: max_retries differs: 3 vs 0" in output
    assert "WARNING: retry_delay differs: 5 vs 1" in output


def test_missing_run_config_is_noted(tmp_path):
    rows = [("GET", "/a", 1, 0, 1, 1, 1)]
    base = _write_run(tmp_path / "base", rows)
    new = _write_run(tmp_path / "new", rows, _config())
    assert f"base: {base} (no run.json; config not checked)" in compare_runs(base, new)
