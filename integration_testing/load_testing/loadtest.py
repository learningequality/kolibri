#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.9"
# dependencies = [
#     "click",
#     "requests",
#     "locust",
#     "le-utils",
#     "playwright",
# ]
# ///
"""
Kolibri Load Testing Tool

A comprehensive CLI for setting up and running load tests against Kolibri servers.
Orchestrates device provisioning, user import, content setup, flow capture, and load testing.

Usage:
    # Full automated workflow
    ./loadtest.py

    # Step-by-step
    ./loadtest.py provision
    ./loadtest.py setup-facility
    ./loadtest.py import-users
    ./loadtest.py import-channel
    ./loadtest.py create-lesson
    ./loadtest.py capture
    ./loadtest.py run --users 50 --duration 5m

"""

import glob
import json
import os
import subprocess
import threading
import time
import webbrowser

import click
from compare import compare_runs
from compare import RUN_CONFIG_FILENAME
from compare import STATS_FILENAME
from kolibri_client import KolibriClient
from logger import info
from logger import plain
from logger import section
from logger import step
from logger import success
from logger import warning
from targets import version_tuple

# Constants
HAR_FILES_DIR = os.path.join(os.path.dirname(__file__), "har_files")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "generated", "results")
QA_CHANNEL_ID = "95a52b386f2c485cb97dd60901674a98"
FACILITY_NAME = "Load Test Facility"
CLASS_NAME = "Load Test Class"


def _exit_with_error(message):
    exception = click.ClickException(message)
    exception.exit_code = 2
    raise exception


def _find_har_file(kolibri_version):
    prefix = "lesson_flow_kolibri_"
    exact = os.path.join(HAR_FILES_DIR, f"{prefix}{kolibri_version}.har")
    if os.path.exists(exact):
        return exact
    candidates = glob.glob(os.path.join(HAR_FILES_DIR, f"{prefix}*.har"))
    if not candidates:
        _exit_with_error(
            f"No HAR file for Kolibri {kolibri_version} and none to fall back "
            f"to in {HAR_FILES_DIR}; run 'capture' first"
        )

    def version_key(path):
        return version_tuple(os.path.basename(path)[len(prefix) : -len(".har")])

    har_path = max(candidates, key=version_key)
    warning(f"No HAR for Kolibri {kolibri_version}; using {har_path}")
    return har_path


def _ensure_credentials(ctx):
    if ctx.obj["server"] is None:
        ctx.obj["server"] = click.prompt("Kolibri server URL")
    if ctx.obj["username"] is None:
        ctx.obj["username"] = click.prompt("Admin username")
    if ctx.obj["password"] is None:
        ctx.obj["password"] = click.prompt("Admin password", hide_input=True)


def _validate_results_options(name, results_dir):
    if name and results_dir:
        _exit_with_error("--name and --results-dir are mutually exclusive")
    if name and os.path.exists(os.path.join(RESULTS_DIR, name, STATS_FILENAME)):
        _exit_with_error(
            f"Results named '{name}' already exist at "
            f"{os.path.join(RESULTS_DIR, name)}; use a new name"
        )


def _resolve_results_dir(ctx, kolibri_version, users, spawn_rate, duration):
    results_dir = ctx.obj["results_dir"]
    run_name = ctx.obj["name"]
    if run_name:
        results_dir = os.path.join(RESULTS_DIR, run_name)
    elif not results_dir:
        run_name = (
            f"{kolibri_version}_{users}u_{spawn_rate}r_{duration}_"
            f"{time.strftime('%Y%m%d-%H%M%S')}"
        )
        results_dir = os.path.join(RESULTS_DIR, run_name)
    else:
        run_name = os.path.basename(os.path.normpath(results_dir))
    return results_dir, run_name


@click.group(invoke_without_command=True)
@click.option("--server", default=None, help="Kolibri server URL")
@click.option("--username", default=None, help="Admin username")
@click.option("--password", default=None, help="Admin password")
@click.option("--har", "-h", help="Specific HAR file to use")
@click.option("--users", "-u", default=50, help="Number of concurrent users")
@click.option("--spawn-rate", "-r", default=50, help="Users spawned per second")
@click.option("--duration", "-t", default="5m", help="Test duration (e.g., 5m, 1h)")
@click.option(
    "--headless", is_flag=True, help="Run without web UI (default: show web UI)"
)
@click.option(
    "--max-retries",
    default=5,
    help="Max retries for 503 errors on trackprogress (default: 5)",
)
@click.option(
    "--retry-delay",
    default=5.0,
    help="Retry delay in seconds for 503 errors (default: 5.0)",
)
@click.option(
    "--results-dir",
    default=None,
    help="Directory for load test results (default: auto-named under generated/results/)",
)
@click.option(
    "--name",
    default=None,
    help="Name for this run's results dir under generated/results/ "
    "(mutually exclusive with --results-dir)",
)
@click.option(
    "--processes",
    default=0,
    help="Locust worker processes to fork (0 = single process, no forking). "
    "Single process handles hundreds of concurrent users; only raise this for "
    "very high load on a multi-core host.",
)
@click.pass_context
def cli(
    ctx,
    server,
    username,
    password,
    har,
    users,
    spawn_rate,
    duration,
    headless,
    max_retries,
    retry_delay,
    results_dir,
    name,
    processes,
):
    """Kolibri Load Testing Tool"""
    _validate_results_options(name, results_dir)
    ctx.ensure_object(dict)
    ctx.obj["server"] = server
    ctx.obj["username"] = username
    ctx.obj["password"] = password
    ctx.obj["har"] = har
    ctx.obj["users"] = users
    ctx.obj["spawn_rate"] = spawn_rate
    ctx.obj["duration"] = duration
    ctx.obj["headless"] = headless
    ctx.obj["max_retries"] = max_retries
    ctx.obj["retry_delay"] = retry_delay
    ctx.obj["results_dir"] = results_dir
    ctx.obj["name"] = name
    ctx.obj["processes"] = processes

    # If no subcommand provided, run full workflow
    if ctx.invoked_subcommand is None:
        full(ctx)


@cli.command()
@click.pass_context
def provision(ctx):
    """Provision device if not already provisioned"""
    _ensure_credentials(ctx)
    client = KolibriClient(ctx.obj["server"])

    if not client.is_provisioned():
        info("Provisioning device...")
        client.provision_if_needed(
            ctx.obj["username"], ctx.obj["password"], FACILITY_NAME
        )
        success("Device provisioned successfully")
    else:
        success("Device already provisioned")


@cli.command()
@click.pass_context
def setup_facility(ctx):
    """Setup or get facility"""
    _ensure_credentials(ctx)
    client = KolibriClient(ctx.obj["server"], ctx.obj["username"], ctx.obj["password"])
    facility_id = client.get_or_create_facility(FACILITY_NAME)
    success(f"Facility: {facility_id}")


@cli.command()
@click.pass_context
def import_users(ctx):
    """Import users from CSV"""
    _ensure_credentials(ctx)
    num_users = ctx.obj["users"]
    client = KolibriClient(ctx.obj["server"], ctx.obj["username"], ctx.obj["password"])
    facility_id = client.get_or_create_facility(FACILITY_NAME)

    info(f"Importing {num_users} users...")
    classroom_id = client.import_users(facility_id, num_users, CLASS_NAME)
    success(f"Users imported, classroom: {classroom_id}")


@cli.command()
@click.pass_context
def import_channel(ctx):
    """Import channel content"""
    _ensure_credentials(ctx)
    client = KolibriClient(ctx.obj["server"], ctx.obj["username"], ctx.obj["password"])
    info(f"Importing channel {QA_CHANNEL_ID}...")
    client.import_channel(QA_CHANNEL_ID)
    success(f"Channel imported: {QA_CHANNEL_ID}")


@cli.command()
@click.pass_context
def create_lesson(ctx):
    """Create comprehensive lesson with mixed content"""
    _ensure_credentials(ctx)
    client = KolibriClient(ctx.obj["server"], ctx.obj["username"], ctx.obj["password"])

    # Get facility and classroom
    facility_id = client.get_or_create_facility(FACILITY_NAME)
    classroom = client.get_classroom(facility_id, CLASS_NAME)

    if not classroom:
        _exit_with_error(
            f"Classroom '{CLASS_NAME}' not found. Run 'import-users' first."
        )

    client.create_lesson(QA_CHANNEL_ID, classroom["id"])


@cli.command()
@click.pass_context
def capture(ctx):
    """Capture HAR file for current Kolibri version"""
    _ensure_credentials(ctx)
    # Get Kolibri version for HAR filename
    client = KolibriClient(ctx.obj["server"], ctx.obj["username"], ctx.obj["password"])
    device_info = client.get_device_info()
    kolibri_version = device_info.get("kolibri_version", "unknown")

    # Name HAR file with Kolibri version
    har_filename = f"lesson_flow_kolibri_{kolibri_version}.har"
    har_path = os.path.join(HAR_FILES_DIR, har_filename)

    # Check if HAR already exists
    if os.path.exists(har_path):
        success(f"HAR file already exists for Kolibri {kolibri_version}")
        plain(f"  {har_path}")
        plain("\nDelete it to re-capture, or use a different Kolibri version")
        return

    os.makedirs(HAR_FILES_DIR, exist_ok=True)

    # recorder needs playwright, which only manual capture uses.
    from recorder import capture_manual_flow  # noqa: PLC0415

    info(f"Manual capture mode for Kolibri {kolibri_version}...")
    capture_manual_flow(ctx.obj["server"], har_path)
    success(f"✓ HAR file captured: {har_path}")


@cli.command()
@click.pass_context
def run(ctx):
    """Run Locust load test"""
    _ensure_credentials(ctx)
    client = KolibriClient(ctx.obj["server"], ctx.obj["username"], ctx.obj["password"])

    # Get Kolibri version to find the right HAR file
    device_info = client.get_device_info()
    kolibri_version = device_info.get("kolibri_version", "unknown")

    if ctx.obj["har"]:
        har_path = ctx.obj["har"]
        if not os.path.exists(har_path):
            _exit_with_error(f"Specified HAR file does not exist: {har_path}")
    else:
        har_path = _find_har_file(kolibri_version)

    # Get facility ID
    facility_id = client.get_or_create_facility(FACILITY_NAME)
    classroom = client.get_classroom(facility_id, CLASS_NAME)
    if not classroom:
        _exit_with_error(
            f"Classroom '{CLASS_NAME}' not found. Run 'import-users' first."
        )
    classroom_id = classroom["id"]

    lesson = client.get_lesson(classroom_id)
    if not lesson:
        _exit_with_error("Comprehensive lesson not found. Run 'create-lesson' first.")
    lesson_id = lesson["id"]

    # Path to locustfile.py in the load_testing directory
    locust_path = os.path.join(os.path.dirname(__file__), "locustfile.py")

    users = ctx.obj["users"]
    spawn_rate = ctx.obj["spawn_rate"]
    duration = ctx.obj["duration"]
    headless = ctx.obj["headless"]
    max_retries = ctx.obj["max_retries"]
    retry_delay = ctx.obj["retry_delay"]

    results_dir, run_name = _resolve_results_dir(
        ctx, kolibri_version, users, spawn_rate, duration
    )
    os.makedirs(results_dir, exist_ok=True)
    run_config = {
        "name": run_name,
        "kolibri_version": kolibri_version,
        "users": users,
        "spawn_rate": spawn_rate,
        "duration": duration,
        "har": har_path,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    with open(os.path.join(results_dir, RUN_CONFIG_FILENAME), "w") as f:
        json.dump(run_config, f, indent=2)
    csv_prefix = os.path.join(results_dir, "stats")
    html_path = os.path.join(results_dir, "report.html")

    # Set up environment variables for locustfile
    env = os.environ.copy()
    env["KOLIBRI_HAR_FILE"] = har_path
    env["KOLIBRI_SERVER_URL"] = ctx.obj["server"]
    env["KOLIBRI_FACILITY_ID"] = facility_id
    env["KOLIBRI_CLASSROOM_ID"] = classroom_id
    env["KOLIBRI_LESSON_ID"] = lesson_id
    env["KOLIBRI_NUM_USERS"] = str(users)
    env["KOLIBRI_MAX_RETRIES"] = str(max_retries)
    env["KOLIBRI_RETRY_DELAY"] = str(retry_delay)
    env["KOLIBRI_VERSION"] = kolibri_version

    cmd = [
        "locust",
        "-f",
        locust_path,
        "-u",
        str(users),
        "-r",
        str(spawn_rate),
        "--run-time",
        duration,
        "--csv",
        csv_prefix,
        "--csv-full-history",
        "--html",
        html_path,
    ]

    processes = ctx.obj["processes"]
    if processes:
        cmd += ["--processes", str(processes)]

    # Only add --headless flag if explicitly requested
    if headless:
        cmd.append("--headless")
    else:
        # Auto-start the test when using web UI
        cmd.append("--autostart")

    info(f"Running Locust test (Kolibri {kolibri_version})...")
    plain(f"HAR file: {har_path}")
    plain(f"Users: {users}, Spawn rate: {spawn_rate}, Duration: {duration}")
    plain(f"Retry config: max_retries={max_retries}, retry_delay={retry_delay}s")
    plain(f"Results: {results_dir}")

    if not headless:
        web_ui_url = "http://localhost:8089"
        info(f"Web UI: {web_ui_url}")
        info("Opening web dashboard...")

        # Open browser automatically
        def open_browser():
            # Wait a moment for Locust to start
            time.sleep(2)
            webbrowser.open(web_ui_url)

        # Open browser in background thread
        threading.Thread(target=open_browser, daemon=True).start()

    subprocess.run(cmd, env=env)


@cli.command()
@click.argument("base")
@click.argument("new")
@click.option("--markdown", is_flag=True, help="Emit a GitHub-flavored markdown table")
def compare(base, new, markdown):
    """Compare two result dirs (names under generated/results/, or paths)"""

    def resolve(arg):
        results_dir = arg if os.path.isdir(arg) else os.path.join(RESULTS_DIR, arg)
        if not os.path.exists(os.path.join(results_dir, STATS_FILENAME)):
            _exit_with_error(f"No {STATS_FILENAME} found in {results_dir}")
        return results_dir

    click.echo(compare_runs(resolve(base), resolve(new), markdown=markdown))


@cli.command()
@click.pass_context
def setup(ctx):
    """Provision device, create facility, import users, import channel, and create lesson"""
    step(1, 5, "Checking device provisioning...")
    ctx.invoke(provision)

    step(2, 5, "Setting up facility...")
    ctx.invoke(setup_facility)

    step(3, 5, "Importing users...")
    ctx.invoke(import_users)

    step(4, 5, "Importing QA channel...")
    ctx.invoke(import_channel)

    step(5, 5, "Creating comprehensive lesson...")
    ctx.invoke(create_lesson)

    success("Setup complete")


def full(ctx):
    """Run complete setup → capture → test workflow"""
    section("=" * 70)
    section("KOLIBRI LOAD TEST - FULL WORKFLOW")
    section("=" * 70)

    total_steps = 6 if ctx.obj["har"] else 7

    # Run each step with step numbering
    step(1, total_steps, "Checking device provisioning...")
    ctx.invoke(provision)

    step(2, total_steps, "Setting up facility...")
    ctx.invoke(setup_facility)

    step(3, total_steps, "Importing users...")
    ctx.invoke(import_users)

    step(4, total_steps, "Importing QA channel...")
    ctx.invoke(import_channel)

    step(5, total_steps, "Creating comprehensive lesson...")
    ctx.invoke(create_lesson)

    if not ctx.obj["har"]:
        step(6, total_steps, "Capturing lesson flow...")
        ctx.invoke(capture)

    step(total_steps, total_steps, "Running load test...")
    ctx.invoke(run)

    section("=" * 70)
    success("WORKFLOW COMPLETE")
    section("=" * 70)


if __name__ == "__main__":
    cli()
