import csv
import json
import os

AGGREGATED_NAME = "Aggregated"
STATS_FILENAME = "stats_stats.csv"
RUN_CONFIG_FILENAME = "run.json"

# locust's stats CSV column positions are not a documented contract.
METRIC_COLUMNS = (
    ("reqs", "Request Count"),
    ("failures", "Failure Count"),
    ("p50", "50%"),
    ("p95", "95%"),
    ("p99", "99%"),
)

TABLE_HEADER = ("endpoint", "reqs", "failures", "p50 (ms)", "p95 (ms)", "p99 (ms)")

CONFIG_WARNING_FIELDS = ("users", "spawn_rate", "duration", "har")


def _parse_metric(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def load_stats(stats_path):
    rows = {}
    with open(stats_path, newline="") as f:
        for row in csv.DictReader(f):
            rows[(row["Type"], row["Name"])] = {
                key: _parse_metric(row[column]) for key, column in METRIC_COLUMNS
            }
    return rows


def load_run_config(results_dir):
    path = os.path.join(results_dir, RUN_CONFIG_FILENAME)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def format_delta(base, new):
    if not base or new is None:
        return "-"
    return f"{(new - base) / base:+.1%}"


def _format_value(value):
    if value is None:
        return "n/a"
    return f"{value:.0f}"


def format_cell(base, new):
    return f"{_format_value(base)} → {_format_value(new)} ({format_delta(base, new)})"


def joined_keys(base_stats, new_stats):
    common = [key for key in base_stats if key in new_stats]

    def p95_delta(key):
        base_p95 = base_stats[key]["p95"] or 0
        new_p95 = new_stats[key]["p95"] or 0
        return abs(new_p95 - base_p95)

    aggregated = [key for key in common if key[1] == AGGREGATED_NAME]
    rest = sorted(
        (key for key in common if key[1] != AGGREGATED_NAME),
        key=lambda key: (-p95_delta(key), key[1], key[0]),
    )
    return aggregated + rest


def _describe_config(label, results_dir, config):
    if config is None:
        return f"{label}: {results_dir} (no run.json; config not checked)"
    return "{}: {} (kolibri {}, {}u, {}r, {}, {}, {})".format(
        label,
        config["name"],
        config["kolibri_version"],
        config["users"],
        config["spawn_rate"],
        config["duration"],
        os.path.basename(config["har"]),
        config["timestamp"],
    )


def config_lines(base_dir, new_dir, base_config, new_config):
    lines = [
        _describe_config("base", base_dir, base_config),
        _describe_config("new ", new_dir, new_config),
    ]
    if base_config is None or new_config is None:
        return lines
    for field in CONFIG_WARNING_FIELDS:
        base_value = base_config.get(field)
        new_value = new_config.get(field)
        if field == "har":
            base_value = os.path.basename(base_value or "")
            new_value = os.path.basename(new_value or "")
        if base_value != new_value:
            lines.append(f"WARNING: {field} differs: {base_value} vs {new_value}")
    if base_config.get("kolibri_version") != new_config.get("kolibri_version"):
        lines.append(
            "note: kolibri version differs (expected when comparing code changes)"
        )
    return lines


def table_rows(base_stats, new_stats):
    rows = []
    for key in joined_keys(base_stats, new_stats):
        request_type, name = key
        base = base_stats[key]
        new = new_stats[key]
        label = f"{request_type} {name}".strip()
        rows.append(
            [label]
            + [format_cell(base[metric], new[metric]) for metric, _ in METRIC_COLUMNS]
        )
    return rows


def render_table(header, rows, markdown=False):
    if markdown:
        lines = ["| " + " | ".join(header) + " |"]
        lines.append("|" + "|".join(" --- " for _ in header) + "|")
        lines.extend("| " + " | ".join(row) + " |" for row in rows)
        return "\n".join(lines)
    aligned = [list(header), *rows]
    widths = [max(len(cells[i]) for cells in aligned) for i in range(len(header))]
    return "\n".join(
        "  ".join(cell.ljust(widths[i]) for i, cell in enumerate(cells)).rstrip()
        for cells in aligned
    )


def one_sided_lines(base_stats, new_stats):
    lines = []
    for label, keys in (
        ("only in base", [key for key in base_stats if key not in new_stats]),
        ("only in new", [key for key in new_stats if key not in base_stats]),
    ):
        for request_type, name in keys:
            lines.append(f"{label}: {request_type} {name}".strip())
    return lines


def compare_runs(base_dir, new_dir, markdown=False):
    base_stats = load_stats(os.path.join(base_dir, STATS_FILENAME))
    new_stats = load_stats(os.path.join(new_dir, STATS_FILENAME))
    sections = [
        "\n".join(
            config_lines(
                base_dir,
                new_dir,
                load_run_config(base_dir),
                load_run_config(new_dir),
            )
        ),
        render_table(
            TABLE_HEADER, table_rows(base_stats, new_stats), markdown=markdown
        ),
    ]
    one_sided = one_sided_lines(base_stats, new_stats)
    if one_sided:
        sections.append("\n".join(one_sided))
    return "\n\n".join(sections)
