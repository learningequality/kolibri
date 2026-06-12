#!/usr/bin/env python
"""
Benchmark any BaseValuesViewset serialization performance.

Benchmarks the core serialization path of a given viewset, outputs results as
JSON, and optionally compares against a previous baseline to detect regressions.

Usage:
    python integration_testing/scripts/viewset_serialization_benchmark.py VIEWSET_PATH [options]

Examples:
    # Baseline run (uses existing data from KOLIBRI_HOME)
    python .../viewset_serialization_benchmark.py kolibri.core.auth.api.FacilityUserViewSet \\
        --inherit-kolibri-home -o baseline.json

    # Comparison run
    python .../viewset_serialization_benchmark.py kolibri.core.auth.api.FacilityUserViewSet \\
        --inherit-kolibri-home --compare baseline.json
"""

import argparse
import gc
import hashlib
import importlib
import json
import logging
import math
import os
import platform
import statistics
import sys
import time
import tracemalloc
from datetime import datetime
from unittest.mock import MagicMock

# Must import kolibri before Django to apply compat patches (e.g. cgi module on Python 3.13+)
from kolibri.utils.main import initialize  # isort: skip

from django.conf import settings
from django.db import connection
from rest_framework import serializers as drf_serializers
from rest_framework.request import Request

logger = logging.getLogger(__name__)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Benchmark a BaseValuesViewset's serialization performance."
    )
    parser.add_argument(
        "viewset",
        nargs="?",
        default=None,
        help="Dotted import path (e.g. kolibri.core.auth.api.FacilityUserViewSet)",
    )
    parser.add_argument(
        "--synthetic",
        action="store_true",
        help="Run with a synthetic viewset and mock data (no DB needed). "
        "Autoscales at sizes 10, 20, 50, 100.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default=None,
        help="JSON report output path (default: <ClassName>_benchmark.json)",
    )
    parser.add_argument(
        "--compare",
        default=None,
        metavar="PATH",
        help="Compare current run against a baseline JSON report",
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=10000,
        help="Timing iterations (default: 10000)",
    )
    parser.add_argument(
        "--memory-iterations",
        type=int,
        default=100,
        help="Memory measurement iterations (default: 100)",
    )
    parser.add_argument(
        "--warmup",
        type=int,
        default=5,
        help="Warmup iterations (default: 5)",
    )
    parser.add_argument(
        "--time-threshold",
        type=float,
        default=5.0,
        help="Acceptable time regression %% (default: 5.0)",
    )
    parser.add_argument(
        "--memory-threshold",
        type=float,
        default=10.0,
        help="Acceptable memory regression %% (default: 10.0)",
    )
    parser.add_argument(
        "--inherit-kolibri-home",
        action="store_true",
        help="Use KOLIBRI_HOME from environment instead of /tmp/kolibri_benchmark",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress stdout, only write JSON",
    )
    return parser.parse_args()


def setup_kolibri(inherit_kolibri_home=False):
    if not inherit_kolibri_home:
        os.environ.setdefault("KOLIBRI_HOME", "/tmp/kolibri_benchmark")

    initialize()


def import_viewset_class(dotted_path):
    from kolibri.core.api import BaseValuesViewset

    module_path, _, class_name = dotted_path.rpartition(".")
    if not module_path:
        logger.error(
            "Invalid viewset path '%s'. Expected format: module.ClassName",
            dotted_path,
        )
        sys.exit(1)

    try:
        module = importlib.import_module(module_path)
    except ImportError as e:
        logger.error("Could not import module '%s': %s", module_path, e)
        sys.exit(1)

    cls = getattr(module, class_name, None)
    if cls is None:
        logger.error("Module '%s' has no attribute '%s'", module_path, class_name)
        sys.exit(1)

    if not (isinstance(cls, type) and issubclass(cls, BaseValuesViewset)):
        logger.error("'%s' is not a subclass of BaseValuesViewset", dotted_path)
        sys.exit(1)

    return cls


def get_queryset_for_viewset(viewset_class):
    """Return (queryset, user) for the viewset.

    user is a FacilityUser when one is found in the DB, otherwise an
    AnonymousUser.  The same user is threaded into _make_viewset so that
    consolidate() runs with the same authentication context as get_queryset().
    """
    queryset = getattr(viewset_class, "queryset", None)
    if queryset is not None:
        return queryset.all(), None

    from django.contrib.auth.models import AnonymousUser

    # Try to find a real authenticated user for viewsets that filter/consolidate
    # by request.user (e.g. LearnerLessonViewset, PinnedDeviceViewSet).
    try:
        from kolibri.core.auth.models import FacilityUser

        user = FacilityUser.objects.first()
    except Exception:
        user = None

    if user is None:
        user = AnonymousUser()

    try:
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        django_request = factory.get("/")

        # Force authentication by setting user directly on the DRF request
        drf_request = Request(django_request)
        drf_request._user = user
        viewset = viewset_class()
        viewset.request = drf_request
        viewset.kwargs = {}
        viewset.format_kwarg = None
        return viewset.get_queryset(), user
    except Exception as e:
        logger.error("Could not obtain queryset for %s: %s", viewset_class.__name__, e)
        sys.exit(1)


def _build_synthetic_viewset():
    """Build a viewset class with a serializer exercising all serialization paths."""

    from kolibri.core.api import BaseValuesViewset
    from kolibri.core.api import ListModelMixin
    from kolibri.core.api import ValuesMethodField

    class TagSerializer(drf_serializers.Serializer):
        id = drf_serializers.CharField()
        label = drf_serializers.CharField()

    class DepartmentSerializer(drf_serializers.Serializer):
        id = drf_serializers.CharField()
        name = drf_serializers.CharField()

    class SyntheticSerializer(drf_serializers.Serializer):
        id = drf_serializers.CharField()
        # Flat field with rename (exercises simple_renames path)
        display_name = drf_serializers.CharField(source="full_name")
        email = drf_serializers.CharField()
        score = drf_serializers.IntegerField()
        # many=True nested (exercises _auto_consolidate groupby)
        tags = TagSerializer(many=True, source="tag_set")
        # Single nested FK (exercises _joined_single dict consolidation)
        department = DepartmentSerializer(source="dept")
        # Method field over multiple sources (exercises _SourcesProxy +
        # invoker callable in field_map).
        contact_label = ValuesMethodField(sources=("full_name", "email"))

        def get_contact_label(self, row):
            return "{} <{}>".format(row.full_name, row.email)

    class SyntheticViewset(BaseValuesViewset, ListModelMixin):
        serializer_class = SyntheticSerializer

    return SyntheticViewset


SYNTHETIC_SIZES = (10, 20, 50, 100)


def _generate_synthetic_data(n):
    """
    Generate n parent records as flat dicts simulating QuerySet.values() output.

    Each parent has 2 tags (many=True join) and 1 department (FK join).
    The flat output has n*2 rows because of the tag join expansion.
    """
    rows = []
    for i in range(n):
        for t in range(2):
            rows.append(
                {
                    "id": f"user-{i:04d}",
                    "full_name": f"User {i}",
                    "email": f"user{i}@example.com",
                    "score": 100 + i,
                    "tag_set__id": f"tag-{i}-{t}",
                    "tag_set__label": f"label-{i}-{t}",
                    "dept__id": f"dept-{i % 5:04d}",
                    "dept__name": f"Department {i % 5}",
                }
            )
    return rows


def _make_synthetic_queryset(flat_items):
    """Wrap flat dict list in a mock queryset compatible with serialize()."""

    class StubMeta:
        class pk:
            name = "id"

    class StubModel:
        _meta = StubMeta()

    mock_qs = MagicMock()
    mock_qs.model = StubModel
    mock_qs.values.side_effect = lambda *a, **kw: [item.copy() for item in flat_items]
    mock_qs.count.return_value = len(set(row["id"] for row in flat_items))
    return mock_qs


def _make_viewset(viewset_class, queryset, user=None):
    """Create a viewset instance with a DRF Request for standalone use.

    Pass the same user returned by get_queryset_for_viewset() so that
    consolidate() runs with the same authentication context used when
    fetching the queryset.
    """
    from rest_framework.test import APIRequestFactory

    factory = APIRequestFactory()
    django_request = factory.get("/")
    drf_request = Request(django_request)

    if user is not None:
        drf_request._user = user

    viewset = viewset_class()
    viewset.queryset = queryset
    viewset.request = drf_request
    viewset.kwargs = {}
    viewset.format_kwarg = None
    return viewset


def calculate_confidence_interval(data):
    """
    Calculate a 95% confidence interval for the mean using the t-distribution.

    Uses a hardcoded table of critical t-values for common small sample sizes
    (rather than adding scipy as a dependency) and falls back to the
    large-sample normal approximation (z=1.96) for n not in the table.

    Returns (lower_bound, upper_bound, margin_of_error).
    """
    n = len(data)
    if n < 2:
        mean = data[0] if data else 0
        return mean, mean, 0

    mean = statistics.mean(data)
    std_err = statistics.stdev(data) / math.sqrt(n)

    # Critical t-values at 95% CI, indexed by sample size (degrees of freedom n-1).
    t_values_95 = {
        2: 12.71,
        3: 4.30,
        4: 3.18,
        5: 2.78,
        6: 2.57,
        7: 2.45,
        8: 2.36,
        9: 2.31,
        10: 2.26,
        11: 2.23,
        12: 2.20,
        15: 2.14,
        20: 2.09,
    }
    t_val = t_values_95.get(n, 1.96)

    margin = t_val * std_err
    return mean - margin, mean + margin, margin


def benchmark_timing(viewset_class, queryset, iterations, warmup, user=None):
    """
    Benchmark serialize() + JSON encoding.

    Returns dict with timing stats and json_size_bytes.
    """
    from rest_framework.renderers import JSONRenderer

    viewset = _make_viewset(viewset_class, queryset, user=user)
    renderer = JSONRenderer()

    for _ in range(warmup):
        result = viewset.serialize(queryset)
        renderer.render(result)

    gc.collect()
    gc.disable()
    times = []
    json_output = None
    try:
        for _ in range(iterations):
            start = time.perf_counter()
            result = viewset.serialize(queryset)
            json_output = renderer.render(result)
            end = time.perf_counter()
            times.append(end - start)
    finally:
        gc.enable()

    ci_lower, ci_upper, ci_margin = calculate_confidence_interval(times)

    return {
        "mean": statistics.mean(times),
        "min": min(times),
        "max": max(times),
        "std": statistics.stdev(times) if len(times) > 1 else 0,
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "ci_margin": ci_margin,
        "json_size_bytes": len(json_output) if json_output else 0,
    }


def benchmark_memory(viewset_class, queryset, iterations, warmup, user=None):
    """
    Benchmark memory usage of serialize().

    Returns dict with mean_bytes, peak_bytes, std_bytes.
    """
    viewset = _make_viewset(viewset_class, queryset, user=user)

    for _ in range(warmup):
        viewset.serialize(queryset)
    gc.collect()

    peak_samples = []
    for _ in range(iterations):
        gc.collect()
        tracemalloc.start()

        result = viewset.serialize(queryset)

        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        peak_samples.append(peak)

        del result

    gc.collect()

    return {
        "mean_bytes": statistics.mean(peak_samples),
        "peak_bytes": max(peak_samples),
        "std_bytes": statistics.stdev(peak_samples) if len(peak_samples) > 1 else 0,
    }


def count_queries(viewset_class, queryset, user=None):
    """Count the number of database queries for one serialize() call."""
    viewset = _make_viewset(viewset_class, queryset, user=user)

    old_debug = settings.DEBUG
    settings.DEBUG = True

    try:
        connection.queries_log.clear()
        viewset.serialize(queryset)
        query_count = len(connection.queries)
    finally:
        settings.DEBUG = old_debug

    return query_count


def capture_data_snapshot(viewset_class, queryset, user=None):
    """
    Serialize once, compute SHA-256 hash of normalized output, extract sample.

    Returns {"output_hash": "sha256:...", "sample": [...]}
    """
    viewset = _make_viewset(viewset_class, queryset, user=user)
    result = viewset.serialize(queryset)

    result_json = json.dumps(result, default=str, sort_keys=True)
    hash_hex = hashlib.sha256(result_json.encode("utf-8")).hexdigest()

    sample = result[:5] if isinstance(result, list) else []

    return {
        "output_hash": f"sha256:{hash_hex}",
        "sample": sample,
    }


def build_report(
    viewset_class,
    dotted_path,
    record_count,
    iterations,
    memory_iterations,
    warmup,
    timing,
    memory,
    queries,
    data_snapshot,
    time_threshold,
    memory_threshold,
):
    has_explicit_values = "values" in viewset_class.__dict__ and isinstance(
        viewset_class.__dict__["values"], tuple
    )
    has_derived = viewset_class._cached_serializer is not None

    return {
        "schema_version": 1,
        "metadata": {
            "viewset_class": dotted_path,
            "has_explicit_values": has_explicit_values,
            "has_derived_field_info": has_derived,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "python_version": platform.python_version(),
            "record_count": record_count,
            "iterations": iterations,
            "memory_iterations": memory_iterations,
            "warmup_iterations": warmup,
        },
        "timing": {
            "mean_ms": timing["mean"] * 1000,
            "min_ms": timing["min"] * 1000,
            "max_ms": timing["max"] * 1000,
            "std_ms": timing["std"] * 1000,
            "ci_lower_ms": timing["ci_lower"] * 1000,
            "ci_upper_ms": timing["ci_upper"] * 1000,
            "ci_margin_ms": timing["ci_margin"] * 1000,
            "json_size_bytes": timing["json_size_bytes"],
        },
        "memory": {
            "mean_bytes": memory["mean_bytes"],
            "peak_bytes": memory["peak_bytes"],
            "std_bytes": memory["std_bytes"],
        },
        "queries": {
            "count": queries,
        },
        "data": data_snapshot,
        "thresholds": {
            "time_regression_pct": time_threshold,
            "memory_regression_pct": memory_threshold,
        },
    }


def write_report(report, path):
    with open(path, "w") as f:
        json.dump(report, f, indent=2, default=str)
        f.write("\n")


def load_report(path):
    with open(path) as f:
        report = json.load(f)
    if report.get("schema_version") != 1:
        logger.warning(
            "Baseline report has schema_version=%s, expected 1",
            report.get("schema_version"),
        )
    return report


def compare_reports(baseline, current, time_threshold, memory_threshold):
    """Compare two reports and return a verdict dict."""
    b_time = baseline["timing"]["mean_ms"]
    c_time = current["timing"]["mean_ms"]
    time_diff_pct = ((c_time - b_time) / b_time * 100) if b_time > 0 else 0

    # Sub-2ms timings are dominated by system noise — only check the
    # percentage threshold when both baseline and current exceed 2ms.
    if b_time < 2.0 and c_time < 2.0:
        time_pass = True
    else:
        time_pass = time_diff_pct <= time_threshold

    b_mem = baseline["memory"]["mean_bytes"]
    c_mem = current["memory"]["mean_bytes"]
    mem_diff_pct = ((c_mem - b_mem) / b_mem * 100) if b_mem > 0 else 0
    mem_pass = mem_diff_pct <= memory_threshold

    b_queries = baseline["queries"]["count"]
    c_queries = current["queries"]["count"]
    if b_queries is not None and c_queries is not None:
        queries_pass = c_queries <= b_queries
        query_diff = c_queries - b_queries
    else:
        queries_pass = True
        query_diff = 0

    b_hash = baseline["data"]["output_hash"]
    c_hash = current["data"]["output_hash"]
    data_match = b_hash == c_hash

    overall_pass = time_pass and mem_pass and queries_pass and data_match

    time_below_floor = b_time < 2.0 and c_time < 2.0

    return {
        "time_diff_pct": time_diff_pct,
        "time_below_floor": time_below_floor,
        "time_pass": time_pass,
        "mem_diff_pct": mem_diff_pct,
        "mem_pass": mem_pass,
        "query_diff": query_diff,
        "queries_pass": queries_pass,
        "data_match": data_match,
        "overall_pass": overall_pass,
    }


def _fmt_bytes(b):
    """Format bytes as human-readable KB."""
    return f"{b / 1024:.1f} KB"


def _pattern_label(metadata):
    if metadata.get("has_derived_field_info"):
        return "derived"
    elif metadata.get("has_explicit_values"):
        return "explicit"
    return "unknown"


def print_comparison(baseline, current, verdict):
    """Print human-readable comparison table."""
    b = baseline
    c = current

    def row(label, b_val, c_val, diff, verdict_str, detail=""):
        line = f"  {label:<18} {b_val:>14} {c_val:>14} {diff:>10} {verdict_str:>6}"
        if detail:
            line += f" {detail}"
        logger.info(line)

    logger.info("\n[Comparison: current vs baseline]")
    logger.info("-" * 70)
    row("Metric", "Baseline", "Current", "Diff", "Verdict")
    logger.info("  %s", "-" * 66)

    # Time
    if verdict["time_below_floor"]:
        time_v, time_detail = "SKIP", "(< 2ms)"
    elif not verdict["time_pass"]:
        time_v = "FAIL"
        time_detail = f"(> {c['thresholds']['time_regression_pct']}%)"
    else:
        time_v, time_detail = "PASS", ""
    row(
        "Time (mean)",
        f"{b['timing']['mean_ms']:.3f} ms",
        f"{c['timing']['mean_ms']:.3f} ms",
        f"{verdict['time_diff_pct']:+.1f}%",
        time_v,
        time_detail,
    )

    # Memory
    mem_pass = verdict["mem_pass"]
    row(
        "Memory (mean)",
        _fmt_bytes(b["memory"]["mean_bytes"]),
        _fmt_bytes(c["memory"]["mean_bytes"]),
        f"{verdict['mem_diff_pct']:+.1f}%",
        "PASS" if mem_pass else "FAIL",
        "" if mem_pass else f"(> {c['thresholds']['memory_regression_pct']}%)",
    )

    # Queries
    b_q = b["queries"]["count"]
    c_q = c["queries"]["count"]
    if b_q is not None and c_q is not None:
        row(
            "DB Queries",
            str(b_q),
            str(c_q),
            f"{verdict['query_diff']:+d}",
            "PASS" if verdict["queries_pass"] else "FAIL",
        )
    else:
        row("DB Queries", "N/A", "N/A", "", "SKIP")

    # Data output
    data_match = verdict["data_match"]
    row(
        "Data output",
        b["data"]["output_hash"][:20] + "...",
        c["data"]["output_hash"][:20] + "...",
        "match" if data_match else "differ",
        "PASS" if data_match else "FAIL",
    )

    # Info rows
    b_size = b["timing"]["json_size_bytes"]
    c_size = c["timing"]["json_size_bytes"]
    row("JSON size", f"{b_size} B", f"{c_size} B", f"{c_size - b_size:+d} B", "INFO")

    b_rec = b["metadata"]["record_count"]
    c_rec = c["metadata"]["record_count"]
    row("Records", str(b_rec), str(c_rec), f"{c_rec - b_rec:+d}", "INFO")

    row(
        "Pattern",
        _pattern_label(b["metadata"]),
        _pattern_label(c["metadata"]),
        "",
        "INFO",
    )

    logger.info("  %s", "-" * 66)

    if not verdict["data_match"]:
        logger.info(
            "  NOTE: Data hashes differ. This may be expected if data changed between runs."
        )
        b_sample = b["data"].get("sample", [])
        c_sample = c["data"].get("sample", [])
        if b_sample and c_sample:
            for i, (bs, cs) in enumerate(zip(b_sample, c_sample)):
                if bs != cs:
                    logger.info("  First sample difference at index %d:", i)
                    logger.info("    Baseline: %s", bs)
                    logger.info("    Current:  %s", cs)
                    break

    overall = "PASS" if verdict["overall_pass"] else "FAIL"
    logger.info("OVERALL VERDICT: %s", overall)


def _run_synthetic(args):
    """Run benchmark with synthetic viewset at multiple data sizes."""
    setup_kolibri(inherit_kolibri_home=args.inherit_kolibri_home)

    viewset_class = _build_synthetic_viewset()
    sizes_report = {}

    for size in SYNTHETIC_SIZES:
        if not args.quiet:
            logger.info("\n--- Size: %d ---", size)
        flat_items = _generate_synthetic_data(size)
        mock_qs = _make_synthetic_queryset(flat_items)

        if not args.quiet:
            logger.info("Running timing benchmark...")
        timing = benchmark_timing(viewset_class, mock_qs, args.iterations, args.warmup)

        if not args.quiet:
            logger.info("Running memory benchmark...")
        memory = benchmark_memory(
            viewset_class, mock_qs, args.memory_iterations, args.warmup
        )

        if not args.quiet:
            logger.info("Capturing data snapshot...")
        data_snapshot = capture_data_snapshot(viewset_class, mock_qs)

        sizes_report[str(size)] = build_report(
            viewset_class=viewset_class,
            dotted_path="<synthetic>",
            record_count=size,
            iterations=args.iterations,
            memory_iterations=args.memory_iterations,
            warmup=args.warmup,
            timing=timing,
            memory=memory,
            queries=None,
            data_snapshot=data_snapshot,
            time_threshold=args.time_threshold,
            memory_threshold=args.memory_threshold,
        )

        if not args.quiet:
            r = sizes_report[str(size)]
            logger.info("  Time: %.3f ms (mean)", r["timing"]["mean_ms"])
            logger.info("  Memory: %s (mean)", _fmt_bytes(r["memory"]["mean_bytes"]))
            logger.info("  Data hash: %s...", r["data"]["output_hash"][:30])

    report = {
        "schema_version": 1,
        "synthetic": True,
        "sizes": sizes_report,
    }

    output_path = args.output or "synthetic_benchmark.json"
    write_report(report, output_path)

    if not args.quiet:
        logger.info("\nReport written to: %s", output_path)

    if args.compare:
        baseline = load_report(args.compare)
        return _compare_synthetic(baseline, report, args)

    return 0


def _compare_synthetic(baseline, current, args):
    """Compare two synthetic reports size-by-size."""
    overall_pass = True

    for size in SYNTHETIC_SIZES:
        key = str(size)
        if key not in baseline.get("sizes", {}):
            if not args.quiet:
                logger.warning("Size %d not in baseline, skipping", size)
            continue
        if key not in current.get("sizes", {}):
            if not args.quiet:
                logger.warning("Size %d not in current, skipping", size)
            continue

        b = baseline["sizes"][key]
        c = current["sizes"][key]
        verdict = compare_reports(b, c, args.time_threshold, args.memory_threshold)

        if not args.quiet:
            logger.info("\n--- Size: %d ---", size)
            print_comparison(b, c, verdict)

        if not verdict["overall_pass"]:
            overall_pass = False

    return 0 if overall_pass else 1


def _run_real_viewset(args):
    """Run benchmark against a real viewset with database data."""
    setup_kolibri(inherit_kolibri_home=args.inherit_kolibri_home)

    viewset_class = import_viewset_class(args.viewset)

    queryset, user = get_queryset_for_viewset(viewset_class)
    record_count = queryset.count()

    if record_count == 0:
        logger.warning(
            "No records found for %s. "
            "Use --inherit-kolibri-home with a populated KOLIBRI_HOME.",
            viewset_class.__name__,
        )

    has_explicit = "values" in viewset_class.__dict__ and isinstance(
        viewset_class.__dict__["values"], tuple
    )
    has_derived = viewset_class._cached_serializer is not None
    pattern = "derived" if has_derived else ("explicit" if has_explicit else "unknown")

    if not args.quiet:
        logger.info("Viewset: %s", args.viewset)
        logger.info("  Pattern: %s", pattern)
        logger.info("  Records: %d", record_count)
        logger.info(
            "  Iterations: %d (timing), %d (memory)",
            args.iterations,
            args.memory_iterations,
        )
        logger.info("  Warmup: %d", args.warmup)

    # Benchmarks
    if not args.quiet:
        logger.info("Running timing benchmark...")
    timing = benchmark_timing(
        viewset_class, queryset, args.iterations, args.warmup, user=user
    )

    if not args.quiet:
        logger.info("Running memory benchmark...")
    memory = benchmark_memory(
        viewset_class, queryset, args.memory_iterations, args.warmup, user=user
    )

    if not args.quiet:
        logger.info("Counting queries...")
    queries = count_queries(viewset_class, queryset, user=user)

    if not args.quiet:
        logger.info("Capturing data snapshot...")
    data_snapshot = capture_data_snapshot(viewset_class, queryset, user=user)

    report = build_report(
        viewset_class=viewset_class,
        dotted_path=args.viewset,
        record_count=record_count,
        iterations=args.iterations,
        memory_iterations=args.memory_iterations,
        warmup=args.warmup,
        timing=timing,
        memory=memory,
        queries=queries,
        data_snapshot=data_snapshot,
        time_threshold=args.time_threshold,
        memory_threshold=args.memory_threshold,
    )

    output_path = args.output or f"{viewset_class.__name__}_benchmark.json"
    write_report(report, output_path)

    if not args.quiet:
        logger.info("\nReport written to: %s", output_path)
        logger.info("  Time: %.3f ms (mean)", report["timing"]["mean_ms"])
        logger.info("  Memory: %s (mean)", _fmt_bytes(report["memory"]["mean_bytes"]))
        logger.info("  Queries: %s", report["queries"]["count"])
        logger.info("  JSON size: %d bytes", report["timing"]["json_size_bytes"])
        logger.info("  Data hash: %s...", report["data"]["output_hash"][:30])

    if args.compare:
        baseline = load_report(args.compare)
        verdict = compare_reports(
            baseline, report, args.time_threshold, args.memory_threshold
        )
        if not args.quiet:
            print_comparison(baseline, report, verdict)
        return 0 if verdict["overall_pass"] else 1

    return 0


def main():
    args = parse_args()
    if not args.viewset and not args.synthetic:
        logger.error("Provide a viewset path or use --synthetic")
        return 1

    if args.synthetic:
        return _run_synthetic(args)

    return _run_real_viewset(args)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    sys.exit(main())
