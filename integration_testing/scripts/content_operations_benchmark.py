#!/usr/bin/env python
"""
Benchmark channel import and content annotation against real channels.

Times the slowest content operations Kolibri performs, outputs results as JSON,
and optionally compares against a previous baseline to detect regressions.

Usage:
    python integration_testing/scripts/content_operations_benchmark.py [options]

Examples:
    # Capture a report
    python .../content_operations_benchmark.py --runs 3 -o baseline.json

    # Comparison run
    python .../content_operations_benchmark.py --runs 3 --compare baseline.json

Before/after protocol
---------------------
Run ONE copy of this script for both captures, from outside the tree, so
that only the Kolibri code underneath it changes:

1. cp integration_testing/scripts/content_operations_benchmark.py /tmp/bench.py
2. git checkout $(git merge-base develop HEAD)
3. python /tmp/bench.py --runs 3 -o /tmp/content_baseline.json
4. git checkout -
5. python /tmp/bench.py --runs 3 --compare /tmp/content_baseline.json \\
       -o /tmp/content_current.json

The copy is not optional: the script does not exist at the merge-base of the
branch that introduces it, and on a later branch that amends it the two
captures would be measured by two different harnesses.

Run both from the repository root, so that a development install imports
kolibri from the checked-out tree and git_revision records which tree that was.

Same machine, same KOLIBRI_HOME, same --runs, one sitting. Capture the
merge-base first: initialize() rolls migrations forward only, so the
reverse order can leave the database ahead of the older code.

This script deletes every channel, content node and local file in the
KOLIBRI_HOME it runs against. It uses its own home
(~/.cache/kolibri_content_benchmark) and ignores an exported KOLIBRI_HOME; pass
--kolibri-home to move it, but not onto a tmpfs — several GB are written there,
and every I/O-bound phase would then be measuring a RAM disk.

Only one instance may use a home at a time, and the script takes an exclusive
lock on benchmark.lock inside it: concurrent runs reset each other's content
tables mid-phase, so both captures measure a database the other is rewriting.

Each iteration is three full channel imports plus an annotation pass and up to
two untimed content-table resets, per channel, so --runs multiplies an
already-long run: --runs 3 over both channels is 18 imports. Budget upwards of
two minutes of reset per iteration per channel; each reset logs its own time.
Use --channels to work against one channel while tuning, then confirm with both.

The first run downloads two large channel databases and logs the size of each.
On-disk footprint is roughly three copies of each (pristine, working, drive
folder) plus the Kolibri database.

--runs 3 is the default and is the value measured stable, on x86_64 Linux
against sqlite with KOLIBRI_HOME on btrfs: the three samples of a phase spread
by under 1% within a capture, and two captures taken twenty minutes apart on an
idle machine agreed to within 1.7% on every phase. Back-to-back --runs 1
captures moved annotation by 5.0%, exactly the default --time-threshold.

Leave the machine idle for both captures; more runs cannot rescue a busy one.
Contention moves every phase by a similar amount in the same direction —
measured at 9-12% across the board, and 36% on annotation with a linter running
— and the answer to that signature is to discard the capture and retake it. A
phase whose mean is under --min-phase-s is exempted from the verdict rather
than settled by more runs.

Troubleshooting
---------------
A cached pristine copy is trusted forever. Kolibri resumes a partial download,
so a run killed mid-download leaves a short <channel_id>-upgrade.sqlite3 that
the next run resumes rather than re-fetches. If this script raises
DatabaseError while describing a channel, delete the copy under
benchmark_channel_dbs/ and any leftover -upgrade.sqlite3, then rerun.

On PostgreSQL the untimed reset ends in VACUUM and then ANALYZE. Postgres is
still not the axis this benchmark exists to protect, so compare a postgres
phase only against the same phase of a postgres baseline captured the same way.
"""

import argparse
import json
import logging
import os
import platform
import shutil
import statistics
import subprocess
import sys
import time
from contextlib import contextmanager
from contextlib import ExitStack
from datetime import datetime
from unittest.mock import patch

try:
    import fcntl
except ImportError:
    # Windows. The home lock below degrades to a warning there.
    fcntl = None

logger = logging.getLogger(__name__)

# Every kolibri, Django and sqlalchemy import is deferred into the function that
# needs it. Do not hoist them:
#
# - kolibri.utils.conf snapshots os.environ["KOLIBRI_HOME"] into a module
#   constant on import (conf.py:28), so importing it before setup_kolibri() sets
#   the variable pins the run to ~/.kolibri — a developer's real home, whose
#   content tables this script deletes.
# - kolibri.core.content modules define Django models, which need the app
#   registry that only initialize() provides.
# - kolibri must still be imported before Django, for its compat patches.
#   setup_kolibri() is the first thing main() calls, so nothing gets there first.
# - set_env() prepends kolibri/dist to sys.path, where `make dist` installs the
#   pinned sqlalchemy. Importing sqlalchemy ahead of initialize() either fails
#   on a dist tree, or wins in sys.modules and unpins the content code.

# Both channels are at schema 5 or below, so both import through a mapping class
# rather than the plain importer, resolved from min_schema_version rather than
# the inferred version; the report records which. That class maps ContentNode
# with a "post" key, which disqualifies the table from the ATTACH path, so
# neither fixture ATTACHes the 40k-row table today. content_localfile does
# ATTACH, though: its mappings are a constant and the file_size rename, both
# expressible in SQL. So expect fresh_import to beat fresh_import_no_attach by
# roughly that table's cost. On c9d7f950 its 77k rows collapse from 78 batched
# inserts into one INSERT ... SELECT, which the statement counts show directly.
BENCHMARK_CHANNELS = (
    "1ceff53605e55bef987d88e0908658c5",
    "c9d7f950ab6b5a1199e3d6c10d7f0103",
)

# Declaration order here is the report and comparison order. The execution order
# in run_channel_iteration() deliberately differs, because each phase there
# establishes the precondition of the next one.
PHASES = (
    "fresh_import",
    "fresh_import_no_attach",
    "annotation",
    "upgrade_import",
    "drive_enumeration",
)

# The ATTACH path is itself gated on the destination engine being sqlite
# (channel_import.py:910), so on any other vendor disabling it would just be a
# second fresh_import.
SQLITE_ONLY_PHASES = frozenset({"fresh_import_no_attach"})

DEFAULT_KOLIBRI_HOME = os.path.join(
    os.path.expanduser("~"), ".cache", "kolibri_content_benchmark"
)

DEFAULT_OUTPUT = "content_operations_benchmark.json"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Benchmark channel import and content annotation."
    )
    parser.add_argument(
        "-o",
        "--output",
        default=DEFAULT_OUTPUT,
        help="JSON report output path (default: %(default)s)",
    )
    parser.add_argument(
        "--compare",
        default=None,
        metavar="PATH",
        help="Compare current run against a baseline JSON report",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=3,
        help="Iterations per channel (default: 3)",
    )
    parser.add_argument(
        "--time-threshold",
        type=float,
        default=5.0,
        help="Acceptable time regression %% (default: 5.0)",
    )
    parser.add_argument(
        "--min-phase-s",
        type=float,
        default=0.05,
        help="Phases whose baseline and current means are both below this are "
        "reported but not enforced (default: 0.05)",
    )
    parser.add_argument(
        "--kolibri-home",
        default=DEFAULT_KOLIBRI_HOME,
        help="KOLIBRI_HOME to run against (default: %(default)s). Every "
        "channel, content node and local file in this home is deleted. Do not "
        "point it at /tmp or any other tmpfs: several GB are written there, and "
        "every I/O-bound phase would be measuring a RAM disk.",
    )
    parser.add_argument(
        "--channels",
        nargs="+",
        choices=BENCHMARK_CHANNELS,
        default=list(BENCHMARK_CHANNELS),
        help="Channel ids to benchmark (default: both)",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress the per-phase results and the comparison table "
        "(progress logging is not suppressed)",
    )
    return parser.parse_args()


# Held open for the life of the process on purpose: closing the file object
# releases the flock, so this cannot be a local in _lock_kolibri_home().
_home_lock_file = None


def _lock_kolibri_home(home):
    """Refuse to start when another instance is already using this home.

    Locked rather than checked: there is then no window between finding the
    home free and taking it, and a killed run leaves nothing to clean up
    because the kernel drops the lock when the process dies.
    """
    global _home_lock_file
    if fcntl is None:
        logger.warning(
            "fcntl is unavailable here, so a concurrent run against %s cannot be "
            "prevented; make sure this is the only instance.",
            home,
        )
        return
    _home_lock_file = open(os.path.join(home, "benchmark.lock"), "w")
    try:
        fcntl.flock(_home_lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        raise SystemExit(
            "Another benchmark run already holds {}. Run one instance at a time: "
            "concurrent runs reset each other's content tables mid-phase, so "
            "both captures measure a database the other one is "
            "rewriting.".format(_home_lock_file.name)
        )


def setup_kolibri(kolibri_home):
    # Assignment, not setdefault: this repo's dev setup exports KOLIBRI_HOME as a
    # matter of course, and reset_content_tables() would then delete every
    # channel, content node and local file in a developer's real home.
    home = os.path.abspath(os.path.expanduser(kolibri_home))
    # conf.py creates KOLIBRI_HOME itself, but only one level deep: it raises
    # "The parent of your KOLIBRI_HOME does not exist" otherwise. The default's
    # parent is ~/.cache, which is not present on every platform, and a
    # --kolibri-home naming a new nested path is an ordinary thing to pass.
    os.makedirs(home, exist_ok=True)
    os.environ["KOLIBRI_HOME"] = home

    # Before initialize(), which migrates the home: two processes doing that at
    # once is already a race, ahead of any content table either of them resets.
    _lock_kolibri_home(home)

    # Imported only now: kolibri.utils.conf reads KOLIBRI_HOME on import.
    from kolibri.utils.main import initialize

    initialize()


def pristine_dir():
    from kolibri.utils.conf import KOLIBRI_HOME

    # Outside content/databases/: get_channel_ids_for_content_database_dir
    # globs *.sqlite3 there and would enumerate our copies as real channels.
    path = os.path.join(KOLIBRI_HOME, "benchmark_channel_dbs")
    os.makedirs(path, exist_ok=True)
    return path


def ensure_pristine_copy(channel_id):
    """Download the channel database once and keep an untouched copy of it."""
    from kolibri.core.content.constants.transfer_types import DOWNLOAD_METHOD
    from kolibri.core.content.utils.channel_transfer import transfer_channel
    from kolibri.utils.data import bytes_for_humans

    pristine_path = os.path.join(pristine_dir(), "{}.sqlite3".format(channel_id))
    if os.path.exists(pristine_path):
        return pristine_path

    logger.info("Downloading channel database %s (this is slow)", channel_id)
    # no_upgrade downloads to the -upgrade path and skips the import entirely.
    downloaded = transfer_channel(channel_id, DOWNLOAD_METHOD, no_upgrade=True)
    shutil.move(downloaded, pristine_path)
    logger.info(
        "Channel database %s is %s",
        channel_id,
        bytes_for_humans(os.path.getsize(pristine_path)),
    )
    return pristine_path


def restore_channel_db(channel_id, pristine_path):
    """Put an identical copy of the channel database in place for a phase."""
    from kolibri.core.content.utils.paths import get_content_database_file_path

    dest = get_content_database_file_path(channel_id)
    shutil.copyfile(pristine_path, dest)
    for suffix in ("-wal", "-shm", "-journal"):
        sidecar = dest + suffix
        if os.path.exists(sidecar):
            os.remove(sidecar)


def describe_channel(db_path):
    """Read a channel database's metadata and resolve its import class."""
    from kolibri.core.content.utils.channel_import import mappings
    from kolibri.core.content.utils.channels import read_channel_metadata_from_db_file

    metadata = read_channel_metadata_from_db_file(db_path)
    # Resolved exactly as initialize_import_manager does (channel_import.py
    # :1276-1282). Restated rather than reused because that function resolves
    # the class only as a side effect of constructing a manager and its source
    # bridge, and this script may not change production code to split the two.
    min_version = metadata.get(
        "min_schema_version", metadata.get("inferred_schema_version")
    )
    import_class = mappings.get(min_version)
    return {
        "name": metadata.get("name"),
        "version": metadata.get("version"),
        "inferred_schema_version": metadata.get("inferred_schema_version"),
        "min_schema_version": metadata.get("min_schema_version"),
        "import_class": import_class.__name__ if import_class else "unmapped",
    }


@contextmanager
def count_statements():
    """Count SQL statements issued through SQLAlchemy and through Django.

    An executemany batch counts as one statement, not one per row. The counters
    stay live through every timed phase; both captures pay the same overhead, so
    the comparison between them stays fair.
    """
    from django.db import connection
    from sqlalchemy import event
    from sqlalchemy.engine import Engine

    counts = {"sqlalchemy": 0, "django": 0}

    def on_sqlalchemy(conn, cursor, statement, params, context, executemany):
        counts["sqlalchemy"] += 1

    def on_django(execute, sql, params, many, context):
        counts["django"] += 1
        return execute(sql, params, many, context)

    # Listening on the class covers every engine, including those the channel
    # import creates later. The removal is registered as soon as the listener is
    # added: a leaked listener inflates every later phase's sqlalchemy count.
    with ExitStack() as stack:
        event.listen(Engine, "before_cursor_execute", on_sqlalchemy)
        stack.callback(event.remove, Engine, "before_cursor_execute", on_sqlalchemy)
        stack.enter_context(connection.execute_wrapper(on_django))
        yield counts


def run_timed(fn, *args):
    """Time one phase, returning (seconds, statement counts)."""
    with count_statements() as counts:
        start = time.perf_counter()
        fn(*args)
        elapsed = time.perf_counter() - start
    return elapsed, counts


def _reclaim_deleted_space():
    """Undo what a bulk delete leaves behind, so every iteration starts alike.

    Deleting a channel leaves the space behind: free pages in sqlite, dead
    tuples in postgres. Without reclaiming it, each iteration imports into a
    slightly more degraded database than the last, and the drift is systematic
    rather than random — over six consecutive sqlite iterations, annotation
    climbed monotonically from 2.81s to 3.17s (+13%). Under the before/after
    protocol the branch is always captured second, so that drift would land
    entirely on the branch.
    """
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute("VACUUM")
        if connection.vendor == "postgresql":
            # VACUUM reclaims the dead tuples but leaves the planner's
            # statistics describing rows that are gone, and the next import's
            # annotation plans its large UPDATEs against them: annotation
            # measured 362s with the VACUUM alone and 4.6s with this ANALYZE.
            cursor.execute("ANALYZE")


def reset_content_tables():
    """Restore the "no content imported" state that fresh_import starts from.

    Without this, leftover LocalFile rows turn the next run's import into an
    upsert over existing rows and the samples stop being comparable.
    """
    from kolibri.core.content.models import ChannelMetadata
    from kolibri.core.content.models import ContentNode
    from kolibri.core.content.models import ContentTag
    from kolibri.core.content.models import Language
    from kolibri.core.content.models import LocalFile

    start = time.perf_counter()
    # The order is load-bearing. ContentNode.lang and File.lang are CASCADE
    # foreign keys to Language (base_models.py:135, :188), so deleting Language
    # first would cascade into the whole content tree outside the
    # disable_mptt_updates() block — the pathological case that guard exists to
    # avoid. ContentNode goes first, Language last.
    ChannelMetadata.objects.all().delete()
    with ContentNode.objects.disable_mptt_updates():
        # MPTT signals on a bulk delete of a 40k-node tree are pathologically
        # slow, which is why delete_content_tree_and_files guards the same way
        # (models.py:425).
        ContentNode.objects.all().delete()
    # Django's cascades cover File, AssessmentMetaData and the m2m through
    # tables. These three are shared across channels, so they must go
    # explicitly.
    LocalFile.objects.all().delete()
    Language.objects.all().delete()
    ContentTag.objects.all().delete()
    _reclaim_deleted_space()
    # Around 30s on a full Khan Academy channel before the VACUUM, almost all of
    # it Django's cascade over the 228k-row File table. Logged at INFO because
    # initialize() reconfigures logging via dictConfig, so DEBUG would never
    # reach the operator. The batched lft/rght idiom from
    # delete_content_tree_and_files, and deleting LocalFile first, were both
    # measured here and came out slower, so the plain cascade stands.
    logger.info("Content table reset took %.1fs", time.perf_counter() - start)


def prepare_drive_folder(channel_id, pristine_path):
    """Give the enumeration phase a per-channel, byte-identical drive folder."""
    from kolibri.core.content.utils.paths import get_content_database_file_path
    from kolibri.utils.conf import KOLIBRI_HOME

    folder = os.path.join(KOLIBRI_HOME, "benchmark_drive", channel_id)
    # datafolder forces the primary path rather than a fallback, and creates the
    # databases directory on the way.
    shutil.copyfile(
        pristine_path, get_content_database_file_path(channel_id, datafolder=folder)
    )
    return folder


def _phase_enabled(phase):
    """Whether a phase can run against the destination database in use."""
    from django.db import connection

    return phase not in SQLITE_ONLY_PHASES or connection.vendor == "sqlite"


def _import_channel(channel_id):
    """Import the staged channel database, failing loudly on a silent no-op.

    import_channel_from_local_db returns False rather than raising when
    check_and_delete_existing_channel decides there is nothing to import
    (channel_import.py:819). Timing that is worse than not timing it: the phase
    records a near-zero mean, and --compare reads a no-op measured against a
    real baseline as an enormous improvement and passes it.

    describe_channel loads channel_import before any phase runs, so the deferred
    import below is a sys.modules lookup and does not land in the measurement.
    """
    from kolibri.core.content.utils.channel_import import import_channel_from_local_db

    if not import_channel_from_local_db(channel_id):
        raise SystemExit(
            "Importing channel {} did nothing, so the phase would have measured "
            "an empty import. The destination database was not in the state the "
            "phase expects.".format(channel_id)
        )


def _time_upgrade_import(channel_id):
    """Time the upgrade path by making the stored version trail the file's.

    current_version < self.channel_version is what triggers
    delete_old_channel_many_to_many_fields, delete_old_channel_tree_data and a
    full re-import (channel_import.py:775-777). Without the decrement,
    check_and_delete_existing_channel returns False at :819 and nothing is
    imported at all. This stands in for a genuine version bump so that no
    second channel database has to be downloaded.

    No cleanup afterwards: the import writes the channel row from the source
    file, so the stored version returns to the file's version on its own.
    """
    from kolibri.core.content.models import ChannelMetadata

    channel = ChannelMetadata.objects.get(id=channel_id)
    if channel.version < 1:
        logger.warning(
            "Channel %s is at version 0; skipping the upgrade import phase",
            channel_id,
        )
        return None
    ChannelMetadata.objects.filter(id=channel_id).update(version=channel.version - 1)
    return run_timed(_import_channel, channel_id)


def run_channel_iteration(channel_id, pristine_path, drive_folder):
    """Run all phases once for one channel, mapping phase key to run_timed()."""
    from kolibri.core.content.models import LocalFile
    from kolibri.core.content.utils.annotation import update_content_metadata
    from kolibri.core.content.utils.channel_import import ChannelImport
    from kolibri.core.content.utils.channels import get_channels_for_data_folder

    results = {}

    # restore_channel_db sits immediately before each import phase it feeds, and
    # nowhere else, so the two import phases stay symmetric in page-cache terms
    # — both are preceded by the same large file copy. That is what makes
    # fresh_import and fresh_import_no_attach readable against each other.
    reset_content_tables()
    restore_channel_db(channel_id, pristine_path)
    results["fresh_import"] = run_timed(_import_channel, channel_id)

    # Untimed and unconditional, so identical in every capture. Annotation on an
    # all-unavailable tree propagates nothing; marking the local files available
    # first puts the pass in its maximum-work shape, with every leaf propagating
    # availability up the tree — the work a real import-then-annotate does.
    LocalFile.objects.all().update(available=True)
    results["annotation"] = run_timed(update_content_metadata, channel_id)

    upgrade = _time_upgrade_import(channel_id)
    if upgrade is not None:
        results["upgrade_import"] = upgrade

    if _phase_enabled("fresh_import_no_attach"):
        reset_content_tables()
        restore_channel_db(channel_id, pristine_path)
        # A no-op leaves _sqlite_db_attached False (the class attribute default,
        # channel_import.py:217), so can_use_sqlite_attach_method returns False
        # for every model at :734 and each one falls back to sqlite_table_import.
        # Patching the base class is enough: no subclass overrides it.
        # try_detaching_sqlite_database needs no patch — with nothing attached
        # its DETACH raises OperationalError, which it already swallows (:929-933).
        with patch.object(
            ChannelImport, "try_attaching_sqlite_database", lambda self: None
        ):
            results["fresh_import_no_attach"] = run_timed(_import_channel, channel_id)

    results["drive_enumeration"] = run_timed(get_channels_for_data_folder, drive_folder)
    return results


def aggregate(samples):
    return {
        "mean_s": statistics.mean(samples),
        "min_s": min(samples),
        "max_s": max(samples),
        "std_s": statistics.stdev(samples) if len(samples) > 1 else 0,
        # The raw samples are what let the operator spot a cold first run.
        "samples_s": list(samples),
    }


def _git_revision():
    try:
        return (
            subprocess.check_output(
                ["git", "rev-parse", "HEAD"], stderr=subprocess.DEVNULL
            )
            .decode()
            .strip()
        )
    except (OSError, subprocess.CalledProcessError):
        return None


def build_report(channel_reports, runs, time_threshold, min_phase_s):
    from django.db import connection

    from kolibri.utils.conf import KOLIBRI_HOME

    return {
        "schema_version": 1,
        "metadata": {
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "python_version": platform.python_version(),
            "platform": platform.platform(),
            "database_vendor": connection.vendor,
            "kolibri_home": KOLIBRI_HOME,
            "git_revision": _git_revision(),
            "runs": runs,
        },
        "channels": channel_reports,
        "thresholds": {
            "time_regression_pct": time_threshold,
            "min_phase_s": min_phase_s,
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


# Report-wide preconditions of the before/after protocol that two captures must
# agree on. They are unauditable after the fact from anything but the report, so
# a mismatch has to surface; the third element says whether it is also fatal.
# The git_revision precondition is checked separately below, because it is the
# one that must *differ* between captures.
_METADATA_PRECONDITIONS = (
    (
        "database_vendor",
        "a comparison across database vendors is not a comparison",
        True,
    ),
    ("platform", "the protocol requires one machine", False),
    (
        "python_version",
        "the protocol requires one interpreter, and a git checkout does not "
        "guarantee one",
        False,
    ),
    (
        "kolibri_home",
        "two homes can sit on different filesystems, one of them possibly a "
        "tmpfs, which moves the I/O-bound phases on its own",
        False,
    ),
    (
        "runs",
        "means taken over different sample counts carry different noise",
        False,
    ),
)

# Per-channel values that should be identical between two captures. A change
# means the source data moved under the measurement.
_CHANNEL_INVARIANTS = (
    "inferred_schema_version",
    "import_class",
    "content_node_count",
    "local_file_count",
)


def _meta(report, key):
    return report.get("metadata", {}).get(key)


def _metadata_warnings(baseline, current):
    """Check the protocol's report-wide preconditions.

    Returns (warnings, fatal), where fatal is True when a mismatch is severe
    enough that the comparison cannot stand at all.
    """
    warnings = []
    fatal = False
    for key, why, is_fatal in _METADATA_PRECONDITIONS:
        if _meta(baseline, key) == _meta(current, key):
            continue
        warnings.append(
            "metadata.{} differs: baseline {}, current {} — {}".format(
                key, _meta(baseline, key), _meta(current, key), why
            )
        )
        fatal = fatal or is_fatal

    revision = _meta(baseline, "git_revision")
    if revision is not None and revision == _meta(current, "git_revision"):
        # Both captures came from the same code, so nothing was measured. This
        # is what a missed `git checkout` in the protocol looks like. It warns
        # rather than fails: a deliberate harness self-check legitimately
        # compares a revision against itself.
        warnings.append(
            "both reports were captured at git revision {}, so no code change "
            "was measured — check the protocol's git checkout steps".format(revision)
        )

    only_one_side = set(baseline.get("channels", {})) ^ set(current.get("channels", {}))
    warnings += [
        "channel {} is present in only one report; skipped".format(channel_id)
        for channel_id in sorted(only_one_side)
    ]
    return warnings, fatal


def _phase_verdict(b_entry, c_entry, time_threshold, min_phase_s):
    b_time = b_entry["mean_s"]
    c_time = c_entry["mean_s"]
    if b_time > 0:
        diff_pct = (c_time - b_time) / b_time * 100
    else:
        # A baseline of zero admits no ratio. Reporting 0% — the sibling's
        # answer, where the only phase is always measurable — would pass a
        # 0s -> 9s blow-up, so an unmeasurable baseline against a measurable
        # current run is unbounded rather than flat. Both at zero stays flat,
        # and the noise floor below exempts it anyway.
        diff_pct = float("inf") if c_time > 0 else 0.0
    # Both means must be below the floor for the phase to be exempt. Testing the
    # baseline alone would exempt a 0.04s -> 4s blow-up, the loudest regression
    # this harness exists to catch.
    enforced = not (b_time < min_phase_s and c_time < min_phase_s)
    return {
        "baseline_s": b_time,
        "current_s": c_time,
        "diff_pct": diff_pct,
        # An unenforced phase keeps its measured diff_pct — a real 3x move stays
        # visible — but cannot fail the run.
        "passed": diff_pct <= time_threshold or not enforced,
        "enforced": enforced,
    }


def _compare_channel(b_channel, c_channel, time_threshold, min_phase_s):
    """Compare one channel's phases, returning (phase verdicts, warnings)."""
    warnings = [
        "{} differs: baseline {}, current {}".format(
            key, b_channel.get(key), c_channel.get(key)
        )
        for key in _CHANNEL_INVARIANTS
        if b_channel.get(key) != c_channel.get(key)
    ]
    b_phases = b_channel.get("phases", {})
    c_phases = c_channel.get("phases", {})
    warnings += [
        "phase {} is present in only one report; skipped".format(phase)
        for phase in PHASES
        if (phase in b_phases) != (phase in c_phases)
    ]
    # PHASES order, not the reports' key order: a phase is only ever compared
    # against the same phase of the same channel.
    phases = {
        phase: _phase_verdict(
            b_phases[phase], c_phases[phase], time_threshold, min_phase_s
        )
        for phase in PHASES
        if phase in b_phases and phase in c_phases
    }
    warnings += [
        "phase {} is below the {}s noise floor on both sides (baseline {:.3f}s, "
        "current {:.3f}s); reported but not enforced".format(
            phase, min_phase_s, verdict["baseline_s"], verdict["current_s"]
        )
        for phase, verdict in phases.items()
        if not verdict["enforced"]
    ]
    return phases, warnings


def compare_reports(baseline, current, time_threshold, min_phase_s):
    """Compare two reports phase by phase and return a verdict dict.

    Statement counts are deliberately not consulted: Django's query log does not
    see SQLAlchemy statements, so the two are not comparable across the
    migration this benchmark exists to measure. They are diagnostics only.
    """
    warnings, fatal = _metadata_warnings(baseline, current)
    b_channels = baseline.get("channels", {})
    channels = {}
    for channel_id, c_channel in current.get("channels", {}).items():
        if channel_id not in b_channels:
            continue
        phases, channel_warnings = _compare_channel(
            b_channels[channel_id], c_channel, time_threshold, min_phase_s
        )
        channels[channel_id] = phases
        warnings += [
            "channel {}: {}".format(channel_id, warning) for warning in channel_warnings
        ]

    compared = [verdict for phases in channels.values() for verdict in phases.values()]
    if not compared:
        # Two reports with no phase in common produce no failures, and a vacuous
        # PASS would green-light a comparison that measured nothing.
        warnings.append(
            "no phase was compared: the two reports have no channel and phase in common"
        )
    return {
        "channels": channels,
        "warnings": warnings,
        "overall_pass": bool(compared)
        and not fatal
        and all(verdict["passed"] for verdict in compared),
    }


def _print_channel_comparison(channel_id, phases, b_channel, c_channel):
    logger.info("%s", "-" * 78)
    logger.info("%s %s", channel_id, c_channel.get("name"))
    logger.info(
        "  %-24s %12s %12s %8s  %s", "Phase", "Baseline", "Current", "Diff", "Verdict"
    )
    for phase, verdict in phases.items():
        logger.info(
            "  %-24s %11.3fs %11.3fs %+7.1f%%  %s%s",
            phase,
            verdict["baseline_s"],
            verdict["current_s"],
            verdict["diff_pct"],
            "PASS" if verdict["passed"] else "FAIL",
            "" if verdict["enforced"] else " (not enforced: below noise floor)",
        )
    for phase in phases:
        b_statements = b_channel["phases"][phase]["statements"]
        c_statements = c_channel["phases"][phase]["statements"]
        logger.info(
            "  %-24s statements (diagnostics only): sqlalchemy %s -> %s "
            "(%+d), django %s -> %s (%+d)",
            phase,
            b_statements["sqlalchemy"],
            c_statements["sqlalchemy"],
            c_statements["sqlalchemy"] - b_statements["sqlalchemy"],
            b_statements["django"],
            c_statements["django"],
            c_statements["django"] - b_statements["django"],
        )


def print_comparison(baseline, current, verdict):
    logger.info("\n[Comparison: current vs baseline]")
    for channel_id, phases in verdict["channels"].items():
        _print_channel_comparison(
            channel_id,
            phases,
            baseline["channels"][channel_id],
            current["channels"][channel_id],
        )
    logger.info("%s", "-" * 78)
    logger.info("OVERALL VERDICT: %s", "PASS" if verdict["overall_pass"] else "FAIL")


def _log_channel_phases(channel_id, phases):
    for phase, entry in phases.items():
        logger.info(
            "  %s %s: mean %.2fs (min %.2fs, max %.2fs, std %.2fs), "
            "%s sqlalchemy / %s django statements",
            channel_id,
            phase,
            entry["mean_s"],
            entry["min_s"],
            entry["max_s"],
            entry["std_s"],
            entry["statements"]["sqlalchemy"],
            entry["statements"]["django"],
        )


def _prepare_channel(channel_id):
    """Fetch, describe and stage one channel, returning what its phases need.

    Keyed by name rather than returned as a tuple, so that the staging contract
    is legible where _benchmark_channel splats it.
    """
    pristine_path = ensure_pristine_copy(channel_id)
    # Describe the pristine copy, not the working copy: its schema version is
    # the one every phase is fed.
    description = describe_channel(pristine_path)
    if description["import_class"] == "unmapped":
        # Stop here rather than several minutes into the first phase.
        # initialize_import_manager guards mappings.get() with except KeyError
        # (channel_import.py:1282), which .get never raises, so ImportClass
        # stays None and the import dies at :1306 with "'NoneType' object is not
        # callable" — a failure that says nothing about the real cause.
        raise SystemExit(
            "Channel {} declares min_schema_version {} (inferred {}), which this "
            "version of Kolibri has no import class for. Report the schema "
            "version; do not substitute another channel.".format(
                channel_id,
                description["min_schema_version"],
                description["inferred_schema_version"],
            )
        )
    return {
        "pristine_path": pristine_path,
        "description": description,
        "drive_folder": prepare_drive_folder(channel_id, pristine_path),
    }


def _benchmark_channel(channel_id, args, pristine_path, description, drive_folder):
    from kolibri.core.content.models import ContentNode
    from kolibri.core.content.models import LocalFile

    if not args.quiet:
        logger.info(
            "Benchmarking %s %s: schema %s, %s",
            channel_id,
            description["name"],
            description["inferred_schema_version"],
            description["import_class"],
        )

    samples = {}
    statements = {}
    for run in range(args.runs):
        start = time.perf_counter()
        results = run_channel_iteration(channel_id, pristine_path, drive_folder)
        logger.info(
            "channel %s iteration %s/%s took %.1fs",
            channel_id,
            run + 1,
            args.runs,
            time.perf_counter() - start,
        )
        # Iterate the keys the iteration actually returned, not PHASES: a phase
        # skipped by vendor or by the upgrade guard is absent, and an absent
        # phase must stay absent rather than be recorded as zero.
        for phase, (seconds, counts) in results.items():
            samples.setdefault(phase, []).append(seconds)
            # Last write wins, and that is deliberate: every iteration feeds the
            # phase an identical database from an identical starting state, so
            # the counts are expected to be the same in each. Only the timings
            # are aggregated.
            statements[phase] = counts

    unknown = sorted(set(samples) - set(PHASES))
    if unknown:
        # PHASES drives both the report and the comparison, so such a phase
        # would be paid for on every iteration and then silently dropped.
        raise SystemExit(
            "run_channel_iteration returned phases missing from PHASES: {}".format(
                ", ".join(unknown)
            )
        )
    phases = {
        phase: dict(aggregate(samples[phase]), statements=statements[phase])
        for phase in PHASES
        if phase in samples
    }
    if not args.quiet:
        _log_channel_phases(channel_id, phases)
    return dict(
        description,
        phases=phases,
        # A cheap invariant that should not move across a refactor.
        content_node_count=ContentNode.objects.count(),
        local_file_count=LocalFile.objects.count(),
    )


def run_benchmark(args):
    for phase in sorted(SQLITE_ONLY_PHASES):
        if not _phase_enabled(phase):
            logger.info(
                "Skipping phase %s: it needs a sqlite destination database", phase
            )

    # Fetch, describe and stage every channel before timing any of them. A
    # capture runs for hours, and the two things that can stop a channel dead —
    # Studio no longer publishing that id, and a schema with no import class —
    # are both known the moment its database is in hand. Discovering either
    # after the first channel has been benchmarked in full throws that work
    # away, for the same reason main() reads the baseline before the run.
    prepared = [
        (channel_id, _prepare_channel(channel_id)) for channel_id in args.channels
    ]

    channel_reports = {
        channel_id: _benchmark_channel(channel_id, args, **preparation)
        for channel_id, preparation in prepared
    }
    return build_report(
        channel_reports, args.runs, args.time_threshold, args.min_phase_s
    )


def main():
    args = parse_args()
    if args.runs < 1:
        # Otherwise the run downloads both channel databases and writes a report
        # whose channels carry no phases at all — which without --compare exits 0.
        raise SystemExit("--runs must be at least 1, got {}".format(args.runs))
    # Read the baseline and check the output directory before the run, not
    # after it. A capture takes tens of minutes to hours and there is no
    # compare-only mode, so a mistyped --compare path or an unwritable -o path
    # discovered at the end throws the whole capture away.
    baseline = load_report(args.compare) if args.compare else None
    if args.compare and os.path.abspath(args.compare) == os.path.abspath(args.output):
        # A baseline costs hours to capture.
        raise SystemExit(
            "--compare and --output are the same path ({}); the new capture "
            "would overwrite the baseline it is compared against.".format(args.output)
        )
    output_dir = os.path.dirname(os.path.abspath(args.output))
    if not os.access(output_dir, os.W_OK):
        raise SystemExit("Output directory is not writable: {}".format(output_dir))

    setup_kolibri(args.kolibri_home)

    report = run_benchmark(args)
    write_report(report, args.output)

    if not args.quiet:
        logger.info("\nReport written to: %s", args.output)

    if baseline is None:
        return 0

    # Thresholds come from this run's flags, not from the baseline's recorded
    # ones: the operator's flags on the comparing run decide the verdict.
    verdict = compare_reports(baseline, report, args.time_threshold, args.min_phase_s)
    # Warnings are not results: --quiet suppresses the tables, not the reasons a
    # comparison may not stand.
    for warning in verdict["warnings"]:
        logger.warning("%s", warning)
    if not args.quiet:
        print_comparison(baseline, report, verdict)
    return 0 if verdict["overall_pass"] else 1


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    sys.exit(main())
