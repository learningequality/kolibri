#!/usr/bin/env python
"""
Benchmark any BaseValuesViewset serialization performance.

Benchmarks the core serialization path of a given viewset, outputs results as
JSON, and optionally compares against a previous baseline to detect regressions.

Usage:
    python integration_testing/scripts/viewset_serialization_benchmark.py VIEWSET_PATH [options]

Examples:
    # Baseline run (uses existing data from KOLIBRI_HOME)
    python .../viewset_serialization_benchmark.py kolibri.core.auth.viewsets.facility_user.FacilityUserViewSet \\
        -o baseline.json

    # Comparison run
    python .../viewset_serialization_benchmark.py kolibri.core.auth.viewsets.facility_user.FacilityUserViewSet \\
        --compare baseline.json

Nothing from kolibri, Django or DRF is imported at module scope: kolibri.utils.conf
snapshots ``os.environ["KOLIBRI_HOME"]`` when it is imported, and --kolibri-home has
to be applied before that. Each of those imports sits in the function that uses it,
all of which run after setup_kolibri().
"""

import argparse
import atexit
import gc
import hashlib
import importlib
import json
import logging
import math
import os
import platform
import shutil
import statistics
import sys
import tempfile
import time
import tracemalloc
import uuid
from collections import defaultdict
from datetime import datetime

logger = logging.getLogger(__name__)

# Bump whenever a fixture or report field changes shape, so --compare against a
# baseline from before the change warns instead of reporting a bogus delta.
# 2: the synthetic serializer dropped its nested fields — they are auto-deferred
# now, and the mock queryset can't serve the follow-up fetches.
SCHEMA_VERSION = 2

# --kolibri-home given with no PATH: benchmark a throwaway home instead of the
# ambient one.
_TEMPORARY_HOME = object()


def parse_args():
    parser = argparse.ArgumentParser(
        description="Benchmark a BaseValuesViewset's serialization performance."
    )
    parser.add_argument(
        "viewset",
        nargs="?",
        default=None,
        help="Dotted import path (e.g. kolibri.core.auth.viewsets.facility_user.FacilityUserViewSet)",
    )
    parser.add_argument(
        "--synthetic",
        action="store_true",
        help="Run with a synthetic viewset over generated fixtures in a "
        "throwaway test database. Autoscales at sizes 10, 20, 50, 100.",
    )
    parser.add_argument(
        "--compare-autodefer",
        action="store_true",
        help="Compare auto-deferred derived vs hand-written consolidate() over "
        "generated fixtures in a throwaway test database, sweeping reverse-FK fan-out.",
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
        "--kolibri-home",
        nargs="?",
        const=_TEMPORARY_HOME,
        default=None,
        metavar="PATH",
        help="Benchmark against PATH instead of the ambient KOLIBRI_HOME; with "
        "no PATH, against a throwaway home removed on exit",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress stdout, only write JSON",
    )
    return parser.parse_args()


def _apply_kolibri_home(args):
    if args.kolibri_home is _TEMPORARY_HOME:
        home = tempfile.mkdtemp(prefix="kolibri_benchmark_")
        atexit.register(shutil.rmtree, home, True)
    elif args.kolibri_home:
        home = os.path.abspath(os.path.expanduser(args.kolibri_home))
    else:
        return
    os.environ["KOLIBRI_HOME"] = home


def setup_kolibri(args):
    _apply_kolibri_home(args)

    # Importing kolibri also applies its compat patches (e.g. the cgi module on
    # Python 3.13+), which Django and DRF need before they are imported.
    from kolibri.utils.main import initialize

    initialize()
    # initialize() installs Kolibri's own logging config, resetting the root
    # level; re-assert --quiet on this module's logger, which that config leaves
    # alone.
    logger.setLevel(logging.ERROR if args.quiet else logging.INFO)


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
    """
    Build a viewset covering both halves of the pipeline: the flat paths
    (passthrough, source rename, method field over multiple sources) and the
    auto-deferred ones (reverse FK, and a forward-FK chain two levels deep).

    Built lazily on the test-only models, so the test app registry and database
    must be set up first.
    """
    from kolibri.core.api import BaseValuesViewset
    from kolibri.core.api import ListModelMixin
    from kolibri.core.api import ValuesMethodField
    from kolibri.core.test.test_app.models import Author
    from kolibri.core.test.test_app.models import Book
    from kolibri.core.test.test_app.models import Country
    from kolibri.core.test.test_app.models import Publisher

    class CountrySerializer(serializers.ModelSerializer):
        class Meta:
            model = Country
            fields = ("id", "name")

    class PublisherSerializer(serializers.ModelSerializer):
        country = CountrySerializer(allow_null=True)

        class Meta:
            model = Publisher
            fields = ("id", "name", "country")

    class BookSerializer(serializers.ModelSerializer):
        class Meta:
            model = Book
            fields = ("id", "title")

    class SyntheticSerializer(serializers.ModelSerializer):
        # rename: exercises the simple_renames path
        display_name = serializers.CharField(source="name")
        # method field over multiple sources, one of them shared with a rename:
        # exercises _SourcesProxy, the field_map invoker, and the refcount that
        # keeps a shared column out of rename promotion
        contact_label = ValuesMethodField(sources=("name", "email"))
        # auto-deferred: reverse FK, and forward FK carrying its own forward FK
        books = BookSerializer(many=True)
        publisher = PublisherSerializer(allow_null=True)

        class Meta:
            model = Author
            fields = (
                "id",
                "display_name",
                "email",
                "contact_label",
                "books",
                "publisher",
            )

        def get_contact_label(self, row):
            return "{} <{}>".format(row.name, row.email)

    class SyntheticViewset(BaseValuesViewset, ListModelMixin):
        serializer_class = SyntheticSerializer
        queryset = Author.objects.all().order_by("name")

    return SyntheticViewset


SYNTHETIC_SIZES = (10, 20, 50, 100)


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
    has_derived = (
        not has_explicit_values
        and getattr(viewset_class, "serializer_class", None) is not None
    )

    return {
        "schema_version": SCHEMA_VERSION,
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
    if report.get("schema_version") != SCHEMA_VERSION:
        logger.warning(
            "Baseline report has schema_version=%s, expected %s — the fixtures "
            "differ, so any timing delta against it is meaningless. Re-record "
            "the baseline with this version of the script.",
            report.get("schema_version"),
            SCHEMA_VERSION,
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
    from django.test.utils import setup_test_environment
    from django.test.utils import teardown_test_environment

    setup_kolibri(args)

    # Register the test-only app so its tables are created in the test DB.
    import kolibri.core.test  # noqa: F401

    # DB-backed: each iteration hits the DB, so cap well below the in-memory default.
    iterations = min(args.iterations, 50)
    memory_iterations = min(args.memory_iterations, 20)

    setup_test_environment()
    old_config = connection.creation.create_test_db(verbosity=0, autoclobber=True)
    try:
        sizes_report = {
            str(size): _synthetic_size_report(size, args, iterations, memory_iterations)
            for size in SYNTHETIC_SIZES
        }
    finally:
        connection.creation.destroy_test_db(old_config, verbosity=0)
        teardown_test_environment()

    report = {
        "schema_version": SCHEMA_VERSION,
        "synthetic": True,
        "sizes": sizes_report,
    }

    output_path = args.output or "synthetic_benchmark.json"
    write_report(report, output_path)

    logger.info("\nReport written to: %s", output_path)

    if args.compare:
        baseline = load_report(args.compare)
        return _compare_synthetic(baseline, report, args)

    return 0


def _synthetic_size_report(size, args, iterations, memory_iterations):
    """Benchmark the synthetic viewset over ``size`` authors on a clean DB."""
    from kolibri.core.test.test_app.models import Author

    logger.info("\n--- Size: %d ---", size)

    Author.objects.all().delete()
    _build_autodefer_fixtures(size)

    viewset_class = _build_synthetic_viewset()
    queryset = viewset_class.queryset

    logger.info("Running timing benchmark...")
    timing = benchmark_timing(viewset_class, queryset, iterations, args.warmup)

    logger.info("Running memory benchmark...")
    memory = benchmark_memory(viewset_class, queryset, memory_iterations, args.warmup)

    logger.info("Capturing data snapshot...")
    data_snapshot = capture_data_snapshot(viewset_class, queryset)

    report = build_report(
        viewset_class=viewset_class,
        dotted_path="<synthetic>",
        record_count=size,
        iterations=iterations,
        memory_iterations=memory_iterations,
        warmup=args.warmup,
        timing=timing,
        memory=memory,
        queries=count_queries(viewset_class, queryset),
        data_snapshot=data_snapshot,
        time_threshold=args.time_threshold,
        memory_threshold=args.memory_threshold,
    )

    logger.info("  Time: %.3f ms (mean)", report["timing"]["mean_ms"])
    logger.info("  Memory: %s (mean)", _fmt_bytes(report["memory"]["mean_bytes"]))
    logger.info("  Queries: %s", report["queries"]["count"])
    logger.info("  Data hash: %s...", report["data"]["output_hash"][:30])

    return report


def _compare_synthetic(baseline, current, args):
    """Compare two synthetic reports size-by-size."""
    overall_pass = True

    for size in SYNTHETIC_SIZES:
        key = str(size)
        if key not in baseline.get("sizes", {}):
            logger.warning("Size %d not in baseline, skipping", size)
            continue
        if key not in current.get("sizes", {}):
            logger.warning("Size %d not in current, skipping", size)
            continue

        b = baseline["sizes"][key]
        c = current["sizes"][key]
        verdict = compare_reports(b, c, args.time_threshold, args.memory_threshold)

        logger.info("\n--- Size: %d ---", size)
        print_comparison(b, c, verdict)

        if not verdict["overall_pass"]:
            overall_pass = False

    return 0 if overall_pass else 1


def _run_real_viewset(args):
    """Run benchmark against a real viewset with database data."""
    setup_kolibri(args)

    viewset_class = import_viewset_class(args.viewset)

    queryset, user = get_queryset_for_viewset(viewset_class)
    record_count = queryset.count()

    if record_count == 0:
        logger.warning(
            "No records found for %s. Seed the home it ran against (%s), or "
            "point --kolibri-home at a seeded one.",
            viewset_class.__name__,
            KOLIBRI_HOME,
        )

    logger.info("Viewset: %s", args.viewset)
    logger.info("  Records: %d", record_count)
    logger.info(
        "  Iterations: %d (timing), %d (memory)",
        args.iterations,
        args.memory_iterations,
    )
    logger.info("  Warmup: %d", args.warmup)

    # Benchmarks
    logger.info("Running timing benchmark...")
    timing = benchmark_timing(
        viewset_class, queryset, args.iterations, args.warmup, user=user
    )

    logger.info("Running memory benchmark...")
    memory = benchmark_memory(
        viewset_class, queryset, args.memory_iterations, args.warmup, user=user
    )

    logger.info("Counting queries...")
    queries = count_queries(viewset_class, queryset, user=user)

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
        print_comparison(baseline, report, verdict)
        return 0 if verdict["overall_pass"] else 1

    return 0


def _mean_ms(fn, warmup, iterations):
    """Mean wall-clock ms over ``iterations`` calls, after ``warmup`` calls."""
    for _ in range(warmup):
        fn()
    gc.collect()
    gc.disable()
    try:
        times = []
        for _ in range(iterations):
            start = time.perf_counter()
            fn()
            times.append(time.perf_counter() - start)
    finally:
        gc.enable()
    return statistics.mean(times) * 1000


def _query_count(fn):
    """Number of DB queries issued by a single ``fn()`` call.

    ``CaptureQueriesContext`` flips the connection's debug cursor, not
    ``settings.DEBUG`` — so the arms whose ``consolidate()`` reshapes output away
    from their declared serializer fields are never output-validated here.
    """
    from django.db import connection
    from django.test.utils import CaptureQueriesContext

    with CaptureQueriesContext(connection) as ctx:
        fn()
    return len(ctx)


def _measure_strategy(serialize, warmup, iterations):
    return {
        "queries": _query_count(serialize),
        "mean_ms": _mean_ms(serialize, warmup, iterations),
    }


def _autodefer_author_queryset():
    from kolibri.core.test.test_app.models import Author

    return Author.objects.all().order_by("name")


def _build_autodefer_fixtures(author_count, books_per_author=3, awards_per_author=2):
    """Create N authors, each with M books and K awards, sharing one publisher.

    Every third author has no publisher, exercising null forward-FK targets.
    Author pks are derived from the index rather than random, so the output hash
    is stable across runs and ``--compare`` can detect real output drift.
    """
    from kolibri.core.test.test_app.models import Author
    from kolibri.core.test.test_app.models import Award
    from kolibri.core.test.test_app.models import Book
    from kolibri.core.test.test_app.models import Country
    from kolibri.core.test.test_app.models import Publisher

    country = Country.objects.create(name="Testland")
    publisher = Publisher.objects.create(name="Test House", country=country)

    authors = []
    for i in range(author_count):
        pub = publisher if i % 3 != 0 else None
        author = Author.objects.create(
            id=uuid.UUID(int=i),
            name="Author {:03d}".format(i),
            email="author{}@example.com".format(i),
            publisher=pub,
        )
        authors.append(author)
        for j in range(books_per_author):
            Book.objects.create(author=author, title="Book {}-{}".format(i, j))
        for j in range(awards_per_author):
            Award.objects.create(author=author, name="Award {}-{}".format(i, j))
    return authors


def _manual_author_consolidate(items):
    """
    Hand-written reverse/forward-FK assembly — the pre-auto-defer baseline the
    derived viewset is benchmarked against.

    The bucketing below duplicates ``serialize_queryset(..., group_by=...)`` on
    purpose: calling that would run the engine this arm exists to measure against.
    """
    from kolibri.core.test.test_app.models import Award
    from kolibri.core.test.test_app.models import Book

    author_pks = [item["id"] for item in items]

    # --- books (reverse FK, one query) ---
    book_rows = list(
        Book.objects.filter(author_id__in=author_pks).values("id", "title", "author_id")
    )
    books_by_author = defaultdict(list)
    for row in book_rows:
        books_by_author[str(row["author_id"])].append(
            {"id": row["id"], "title": row["title"]}
        )

    # --- awards (reverse FK, one query) ---
    award_rows = list(
        Award.objects.filter(author_id__in=author_pks).values("id", "name", "author_id")
    )
    awards_by_author = defaultdict(list)
    for row in award_rows:
        awards_by_author[str(row["author_id"])].append(
            {"id": row["id"], "name": row["name"]}
        )

    # --- publishers + countries (forward FK, one query each) ---
    publisher_ids = {item["publisher_id"] for item in items if item["publisher_id"]}
    publishers_by_id = _build_publishers_by_id(publisher_ids)

    for item in items:
        item["books"] = books_by_author.get(str(item["id"]), [])
        item["awards"] = awards_by_author.get(str(item["id"]), [])
        pid = item.pop("publisher_id")
        item["publisher"] = publishers_by_id.get(str(pid)) if pid else None

    return items


def _build_publishers_by_id(publisher_ids):
    """``{publisher_pk: {id, name, country}}`` for the given pks, with country
    nested via a single follow-up query."""
    from kolibri.core.test.test_app.models import Country
    from kolibri.core.test.test_app.models import Publisher

    if not publisher_ids:
        return {}

    pub_rows = list(
        Publisher.objects.filter(pk__in=publisher_ids).values(
            "id", "name", "country_id"
        )
    )
    country_ids = {row["country_id"] for row in pub_rows if row["country_id"]}
    country_rows = Country.objects.filter(pk__in=country_ids).values("id", "name")
    countries_by_id = {
        str(row["id"]): {"id": row["id"], "name": row["name"]} for row in country_rows
    }

    publishers_by_id = {}
    for row in pub_rows:
        cid = row["country_id"]
        publishers_by_id[str(row["id"])] = {
            "id": row["id"],
            "name": row["name"],
            "country": countries_by_id.get(str(cid)) if cid else None,
        }
    return publishers_by_id


def _build_autodefer_viewsets():
    """The derived and hand-consolidated Author viewsets, built lazily: their
    serializer and queryset class attributes import test-only models, which
    requires the test app registry and database to be set up first."""
    from rest_framework import serializers

    from kolibri.core.api import BaseValuesViewset
    from kolibri.core.api import ListModelMixin
    from kolibri.core.test.test_app.models import Author
    from kolibri.core.test.test_app.models import Award
    from kolibri.core.test.test_app.models import Book
    from kolibri.core.test.test_app.models import Country
    from kolibri.core.test.test_app.models import Publisher

    class CountrySerializer(serializers.ModelSerializer):
        class Meta:
            model = Country
            fields = ("id", "name")

    class PublisherSerializer(serializers.ModelSerializer):
        country = CountrySerializer(allow_null=True)

        class Meta:
            model = Publisher
            fields = ("id", "name", "country")

    class AwardSerializer(serializers.ModelSerializer):
        class Meta:
            model = Award
            fields = ("id", "name")

    class BookSerializer(serializers.ModelSerializer):
        class Meta:
            model = Book
            fields = ("id", "title")

    class AuthorSerializer(serializers.ModelSerializer):
        """Two many=True relations + a deep forward-FK chain (publisher→country)."""

        books = BookSerializer(many=True)
        awards = AwardSerializer(many=True)
        publisher = PublisherSerializer(allow_null=True)

        class Meta:
            model = Author
            fields = ("id", "name", "books", "awards", "publisher")

    class DerivedAuthorViewset(BaseValuesViewset, ListModelMixin):
        """Serializer-derived — auto-defers books, awards, publisher, country."""

        serializer_class = AuthorSerializer
        queryset = Author.objects.all().order_by("name")

    class FlatAuthorSerializer(serializers.ModelSerializer):
        """Flat Author columns only — no relations for the engine to fetch.

        ``publisher_id`` is the FK attname, so it derives as an annotation and a
        primitive field passes the raw pk through. A ``UUIDField`` would
        hex-format it, and ``_manual_author_consolidate``'s ``str(pid)`` lookup
        would then miss every row.
        """

        publisher_id = serializers.IntegerField(allow_null=True)

        class Meta:
            model = Author
            fields = ("id", "name", "publisher_id")

    class ManualAuthorViewset(BaseValuesViewset, ListModelMixin):
        """Hand-written consolidate() — every relation assembled in Python."""

        serializer_class = FlatAuthorSerializer
        queryset = Author.objects.all().order_by("name")

        def consolidate(self, items, queryset):
            return _manual_author_consolidate(items)

    return DerivedAuthorViewset, ManualAuthorViewset


def _build_to_one_fixtures(author_count, shared_publisher):
    """Authors with a ``publisher → country`` chain and no to-many relations.

    ``shared_publisher`` decides whether every author points at one publisher (the
    case batching wins) or each at its own (the case it can't help).
    """
    from kolibri.core.test.test_app.models import Author
    from kolibri.core.test.test_app.models import Country
    from kolibri.core.test.test_app.models import Publisher

    Author.objects.all().delete()
    Publisher.objects.all().delete()
    Country.objects.all().delete()

    country = Country.objects.create(name="Testland")
    shared = (
        Publisher.objects.create(name="Test House", country=country)
        if shared_publisher
        else None
    )
    for i in range(author_count):
        publisher = shared or Publisher.objects.create(
            name="House {:04d}".format(i), country=country
        )
        Author.objects.create(
            id=uuid.UUID(int=i),
            name="Author {:04d}".format(i),
            email="author{}@example.com".format(i),
            publisher=publisher,
        )


def _nest_joined_to_one(item):
    """Reshape one flat joined row into the nested dicts the deferred arm returns."""
    publisher_id = item.pop("pub_id")
    publisher_name = item.pop("pub_name")
    country_id = item.pop("country_id")
    country_name = item.pop("country_name")
    item["publisher"] = (
        None
        if publisher_id is None
        else {
            "id": publisher_id,
            "name": publisher_name,
            "country": (
                None if country_id is None else {"id": country_id, "name": country_name}
            ),
        }
    )
    return item


def _nest_joined_publisher(item):
    """Single-hop variant of ``_nest_joined_to_one``: publisher, no country."""
    publisher_id = item.pop("pub_id")
    name = item.pop("pub_name")
    item["publisher"] = (
        None if publisher_id is None else {"id": publisher_id, "name": name}
    )
    return item


def _build_to_one_viewsets():
    """The two to-one strategies for the same output: auto-deferred follow-up
    queries, versus joined columns reshaped in Python.

    The main sweep can't show this trade-off — its baseline ``consolidate()``
    defers too. The joined arm declares the target's columns as scalar sourced
    fields, so they ride along on the parent query.
    """
    from kolibri.core.api import BaseValuesViewset
    from kolibri.core.api import ListModelMixin
    from kolibri.core.test.test_app.models import Author
    from kolibri.core.test.test_app.models import Country
    from kolibri.core.test.test_app.models import Publisher

    class CountrySerializer(serializers.ModelSerializer):
        class Meta:
            model = Country
            fields = ("id", "name")

    class PublisherSerializer(serializers.ModelSerializer):
        country = CountrySerializer(allow_null=True)

        class Meta:
            model = Publisher
            fields = ("id", "name", "country")

    class ChainAuthorSerializer(serializers.ModelSerializer):
        """Two to-one hops: author → publisher → country."""

        publisher = PublisherSerializer(allow_null=True)

        class Meta:
            model = Author
            fields = ("id", "name", "publisher")

    class FlatPublisherSerializer(serializers.ModelSerializer):
        class Meta:
            model = Publisher
            fields = ("id", "name")

    class SingleHopAuthorSerializer(serializers.ModelSerializer):
        """One to-one hop — the common production shape (e.g. ``Lesson.classroom``)."""

        publisher = FlatPublisherSerializer(allow_null=True)

        class Meta:
            model = Author
            fields = ("id", "name", "publisher")

    class DeferredChainViewset(BaseValuesViewset, ListModelMixin):
        serializer_class = ChainAuthorSerializer
        queryset = Author.objects.all().order_by("name")

    class JoinedChainSerializer(serializers.ModelSerializer):
        """The same two hops as scalar sourced fields, so they stay joined
        columns on the parent query instead of auto-deferring.

        The output names are deliberately not ``publisher_id`` /
        ``publisher_name``: a plain rename is promoted to
        ``annotate(target=F(source))``, and Django rejects an annotation whose
        alias collides with the FK's own column.
        """

        pub_id = serializers.IntegerField(source="publisher.id", allow_null=True)
        pub_name = serializers.CharField(source="publisher.name", allow_null=True)
        country_id = serializers.IntegerField(
            source="publisher.country.id", allow_null=True
        )
        country_name = serializers.CharField(
            source="publisher.country.name", allow_null=True
        )

        class Meta:
            model = Author
            fields = ("id", "name", "pub_id", "pub_name", "country_id", "country_name")

    class JoinedChainViewset(BaseValuesViewset, ListModelMixin):
        serializer_class = JoinedChainSerializer
        queryset = Author.objects.all().order_by("name")

        def consolidate(self, items, queryset):
            return [_nest_joined_to_one(item) for item in items]

    class DeferredSingleHopViewset(BaseValuesViewset, ListModelMixin):
        serializer_class = SingleHopAuthorSerializer
        queryset = Author.objects.all().order_by("name")

    class JoinedSingleHopSerializer(serializers.ModelSerializer):
        """One hop as scalar sourced fields — see ``JoinedChainSerializer`` on
        why the output names avoid ``publisher_id``."""

        pub_id = serializers.IntegerField(source="publisher.id", allow_null=True)
        pub_name = serializers.CharField(source="publisher.name", allow_null=True)

        class Meta:
            model = Author
            fields = ("id", "name", "pub_id", "pub_name")

    class JoinedSingleHopViewset(BaseValuesViewset, ListModelMixin):
        serializer_class = JoinedSingleHopSerializer
        queryset = Author.objects.all().order_by("name")

        def consolidate(self, items, queryset):
            return [_nest_joined_publisher(item) for item in items]

    return {
        "1 hop": (DeferredSingleHopViewset, JoinedSingleHopViewset),
        "2 hops": (DeferredChainViewset, JoinedChainViewset),
    }


# A whole serialize() call here is well under a millisecond, so one batch cannot
# separate a strategy difference from scheduler noise — an earlier read that
# deferring *won* for shared targets came from a cell whose spread was several
# times its delta.
_TO_ONE_REPEATS = 3


def _repeat_measure(serialize, warmup, iterations):
    """
    Median and half-spread of ``_TO_ONE_REPEATS`` independent measurements.

    Median rather than mean: a run that collides with GC or CPU migration lands
    far above the others, and the deltas measured here are small enough that one
    such outlier would dominate a mean over three runs.
    """
    runs = [
        _measure_strategy(serialize, warmup, iterations) for _ in range(_TO_ONE_REPEATS)
    ]
    times = [run["mean_ms"] for run in runs]
    return {
        "queries": runs[0]["queries"],
        "median_ms": statistics.median(times),
        "spread_ms": (max(times) - min(times)) / 2,
    }


def _to_one_size_report(
    to_one_viewsets, depth, author_count, shared_publisher, warmup, iterations
):
    deferred_cls, joined_cls = to_one_viewsets[depth]
    _build_to_one_fixtures(author_count, shared_publisher)
    qs = _autodefer_author_queryset
    deferred = deferred_cls()
    joined = joined_cls()

    return {
        "depth": depth,
        "authors": author_count,
        "shared_publisher": shared_publisher,
        "output_equal": _normalise(deferred.serialize(qs()))
        == _normalise(joined.serialize(qs())),
        "deferred": _repeat_measure(
            lambda: deferred.serialize(qs()), warmup, iterations
        ),
        "joined": _repeat_measure(lambda: joined.serialize(qs()), warmup, iterations),
    }


def _print_to_one_report(sizes):
    """Report the isolated cost of deferring a to-one against joining it.

    ``noise`` is the larger arm spread over the delta. Above ~0.5 the two arms
    are indistinguishable at that point and the percentage means nothing.
    """
    logger.info("\n=== to-one: deferred vs joined (isolated) ===")
    for size in sizes:
        d, j = size["deferred"], size["joined"]
        delta = d["median_ms"] - j["median_ms"]
        noise = (
            max(d["spread_ms"], j["spread_ms"]) / abs(delta) if delta else float("inf")
        )
        logger.info(
            "%-7s %4d authors  %-8s  output_equal=%s  queries %d/%d  "
            "ms %.3f+-%.3f/%.3f+-%.3f  deferred %+.1f%%  noise %.2f%s",
            size["depth"],
            size["authors"],
            "shared" if size["shared_publisher"] else "distinct",
            size["output_equal"],
            d["queries"],
            j["queries"],
            d["median_ms"],
            d["spread_ms"],
            j["median_ms"],
            j["spread_ms"],
            delta / j["median_ms"] * 100,
            noise,
            "  (INDISTINGUISHABLE)" if noise > 0.5 else "",
        )
    logger.info(
        "Isolated cost only — these viewsets do nothing but the to-one, so the "
        "round trip is most of the measurement. On real viewsets it costs "
        "0-0.15ms."
    )


def _sort_key(obj):
    """Stable sort key for a JSON-compatible value (dict/list/scalar)."""
    if isinstance(obj, dict):
        return repr(sorted((k, _sort_key(v)) for k, v in obj.items()))
    if isinstance(obj, list):
        return repr([_sort_key(x) for x in obj])
    return repr(obj)


def _normalise_item(item):
    """Recursively sort list fields so ordering doesn't affect equality. Scalars
    are kept typed — both paths read through ``.values()``, so equivalent output
    is identically typed; stringifying would mask a real type divergence (e.g.
    ``id: 1`` vs ``id: "1"``) between the two strategies."""
    result = {}
    for k, v in item.items():
        if isinstance(v, list):
            result[k] = sorted(
                [_normalise_item(x) if isinstance(x, dict) else x for x in v],
                key=_sort_key,
            )
        elif isinstance(v, dict):
            result[k] = _normalise_item(v)
        else:
            result[k] = v
    return result


def _normalise(items):
    """Return a sorted, normalised representation of a serialized list."""
    return sorted((_normalise_item(item) for item in items), key=_sort_key)


def _autodefer_size_report(
    derived_cls, manual_cls, author_count, books_per_author, warmup, iterations
):
    """Compare the auto-deferred derived path to a hand-written
    consolidate() at one (authors, books-per-author) point. Books-per-author is
    the reverse-FK fan-out."""
    from kolibri.core.test.test_app.models import Author
    from kolibri.core.test.test_app.models import Country
    from kolibri.core.test.test_app.models import Publisher

    # Clean slate so sizes don't accumulate (cascades to books/awards).
    Author.objects.all().delete()
    Publisher.objects.all().delete()
    Country.objects.all().delete()
    _build_autodefer_fixtures(author_count, books_per_author=books_per_author)

    qs = _autodefer_author_queryset
    derived = derived_cls()
    manual = manual_cls()

    derived_out = _normalise(derived.serialize(qs()))
    manual_out = _normalise(manual.serialize(qs()))

    return {
        "authors": author_count,
        "books_per_author": books_per_author,
        "output_equal": derived_out == manual_out,
        "derived": _measure_strategy(
            lambda: derived.serialize(qs()), warmup, iterations
        ),
        "manual": _measure_strategy(lambda: manual.serialize(qs()), warmup, iterations),
    }


def _print_autodefer_report(report):
    for size in report["sizes"]:
        logger.info(
            "\n=== %d authors x %d books ===",
            size["authors"],
            size["books_per_author"],
        )
        d, m = size["derived"], size["manual"]
        logger.info(
            "derived vs manual: output_equal=%s  queries %d/%d  ms %.3f/%.3f",
            size["output_equal"],
            d["queries"],
            m["queries"],
            d["mean_ms"],
            m["mean_ms"],
        )
    logger.info(
        "\nderived query count fixed across fan-out: %s",
        report["derived_queries_fixed"],
    )
    _print_to_one_report(report["to_one_sizes"])


def _run_autodefer_compare(args):
    """In-process comparison over a throwaway test database.

    Confirms the auto-deferred serializer-derived path produces identical output
    to a hand-written consolidate(), and that its query count stays fixed as the
    reverse-FK fan-out grows — the derived path avoids joins, so it issues a
    fixed number of extra queries (an accepted trade-off), never one that scales
    with row count. Records each path's timing across the sweep; the derived
    path is expected to run more queries than the join-using baseline.
    """
    from django.test.utils import setup_test_environment
    from django.test.utils import teardown_test_environment

    setup_kolibri(args)

    # Register the test-only app so its tables are created in the test DB.
    import kolibri.core.test  # noqa: F401

    # (authors, books_per_author): sweep reverse-FK fan-out.
    sizes = [(100, 3), (100, 10), (100, 30), (100, 100), (100, 300)]
    # (authors, shared_publisher): sweep the to-one trade-off over page size and
    # target cardinality — deferring is one extra round trip to stop repeating the
    # target's columns per parent row, so it should win when targets are shared and
    # lose as distinct targets approach the parent count.
    to_one_sizes = [
        (depth, n, shared)
        for depth in ("1 hop", "2 hops")
        for n in (25, 100, 500)
        for shared in (True, False)
    ]
    # DB-backed: each iteration hits the DB, so cap well below the in-memory default.
    iterations = min(args.iterations, 50)

    setup_test_environment()
    old_config = connection.creation.create_test_db(verbosity=0, autoclobber=True)
    try:
        derived_cls, manual_cls = _build_autodefer_viewsets()
        to_one_viewsets = _build_to_one_viewsets()

        report = {
            "mode": "autodefer-compare",
            "sizes": [
                _autodefer_size_report(
                    derived_cls, manual_cls, n, books, args.warmup, iterations
                )
                for n, books in sizes
            ],
            "to_one_sizes": [
                _to_one_size_report(
                    to_one_viewsets, depth, n, shared, args.warmup, iterations
                )
                for depth, n, shared in to_one_sizes
            ],
        }
    finally:
        connection.creation.destroy_test_db(old_config, verbosity=0)
        teardown_test_environment()

    # The derived path's query count must not grow with fan-out. Authors are
    # held at 100 while books-per-author sweeps, so a constant derived count
    # across sizes is the fixed-not-N-based guarantee.
    derived_query_counts = {s["derived"]["queries"] for s in report["sizes"]}
    report["derived_queries_fixed"] = len(derived_query_counts) == 1
    report["passed"] = (
        all(s["output_equal"] for s in report["sizes"])
        and all(s["output_equal"] for s in report["to_one_sizes"])
        and report["derived_queries_fixed"]
    )

    _print_autodefer_report(report)

    output_path = args.output or "autodefer_benchmark.json"
    write_report(report, output_path)
    logger.info("\nReport written to: %s", output_path)
    return 0 if report["passed"] else 1


def main():
    args = parse_args()
    # Every progress and comparison line goes through logging, so the level is
    # the whole of --quiet.
    logging.basicConfig(
        level=logging.ERROR if args.quiet else logging.INFO, format="%(message)s"
    )

    if args.compare_autodefer:
        return _run_autodefer_compare(args)

    if not args.viewset and not args.synthetic:
        logger.error("Provide a viewset path or use --synthetic")
        return 1

    if args.synthetic:
        return _run_synthetic(args)

    return _run_real_viewset(args)


if __name__ == "__main__":
    sys.exit(main())
