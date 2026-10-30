import hashlib
import os
import shutil
import subprocess
import sys
import tarfile

import click
from executors import LocalExecutor
from logger import error
from logger import info
from logger import success
from targets import file_sha
from targets import worktree_identity

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(THIS_DIR, "generated", "templates")
LOADTEST = os.path.join(THIS_DIR, "loadtest.py")
PRUNE_DIRS = ("process_cache", "logs", "sessions")
PRUNE_FILES = ("server.pid", "kolibri.pid")
CREDENTIALS_SALT = b"kolibri-bench-template"
CREDENTIALS_ITERATIONS = 100_000
TEMPLATES_KEPT = 2
SETUP_INPUTS = tuple(
    os.path.join(THIS_DIR, name)
    for name in ("kolibri_client.py", "utils.py", "lesson_resources.json")
)


def template_key(baseline_id, users, channel_id, username, password):
    credentials = hashlib.pbkdf2_hmac(
        "sha256",
        f"{username}:{password}".encode(),
        CREDENTIALS_SALT,
        CREDENTIALS_ITERATIONS,
    ).hex()
    setup = ",".join(file_sha(path) for path in SETUP_INPUTS)
    return hashlib.sha256(
        f"{baseline_id}:{users}:{channel_id}:{credentials}:{setup}".encode()
    ).hexdigest()[:12]


def baseline_identity(target):
    if target.is_dev:
        return worktree_identity(target.source)
    return target.wheel_sha, []


def prune_home(home):
    for directory in PRUNE_DIRS:
        shutil.rmtree(os.path.join(home, directory), ignore_errors=True)
    for filename in PRUNE_FILES:
        path = os.path.join(home, filename)
        if os.path.exists(path):
            os.remove(path)


def template_content_hash(template_dir):
    digest = hashlib.sha256()
    for root, dirs, files in os.walk(template_dir):
        dirs.sort()
        for name in sorted(files):
            path = os.path.join(root, name)
            relative = os.path.relpath(path, template_dir)
            digest.update(f"{relative}\0{os.path.getsize(path)}\0".encode())
            with open(path, "rb") as f:
                for chunk in iter(lambda: f.read(1 << 20), b""):
                    digest.update(chunk)
    return digest.hexdigest()[:12]


def template_tarball(template_dir):
    tarball = template_dir + ".tar.gz"
    if not os.path.exists(tarball):
        partial = tarball + ".partial"
        with tarfile.open(partial, "w:gz") as tar:
            for entry in sorted(os.listdir(template_dir)):
                tar.add(os.path.join(template_dir, entry), arcname=entry)
        os.rename(partial, tarball)
    return tarball


def _prune_templates(current_key):
    if not os.path.isdir(TEMPLATES_DIR):
        return
    entries = {}
    for name in os.listdir(TEMPLATES_DIR):
        key = name.split(".", 1)[0]
        if key != current_key:
            entries.setdefault(key, []).append(os.path.join(TEMPLATES_DIR, name))

    def last_used(key):
        template_dir = os.path.join(TEMPLATES_DIR, key)
        return os.path.getmtime(template_dir) if os.path.isdir(template_dir) else 0

    for key in sorted(entries, key=last_used, reverse=True)[TEMPLATES_KEPT - 1 :]:
        info(f"Pruning template {key}")
        for path in entries[key]:
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)


def ensure_template(
    baseline, users, channel_id, username, password, port, regenerate=False
):
    identity, dirty = baseline_identity(baseline)
    if dirty:
        identity += "-dirty"
    key = template_key(identity, users, channel_id, username, password)
    template_dir = os.path.join(TEMPLATES_DIR, key)
    hash_file = template_dir + ".hash"
    if (
        os.path.isdir(template_dir)
        and os.path.exists(hash_file)
        and not regenerate
        and not dirty
    ):
        os.utime(template_dir)
        with open(hash_file) as f:
            info(f"Reusing template {key}")
            return template_dir, f.read().strip()

    _prune_templates(key)
    info(f"Generating template {key} from baseline '{baseline.name}'...")
    scratch = template_dir + ".scratch"
    shutil.rmtree(scratch, ignore_errors=True)
    os.makedirs(scratch)
    executor = LocalExecutor(port=port, run_home=scratch)
    executor.prepare(baseline)
    try:
        executor.start()
        result = subprocess.run(
            [
                sys.executable,
                LOADTEST,
                "--server",
                executor.server_url,
                "--username",
                username,
                "--password",
                password,
                "--users",
                str(users),
                "setup",
            ]
        )
        if result.returncode != 0:
            raise click.ClickException("loadtest.py setup failed")
    finally:
        try:
            executor.stop()
        except click.ClickException as stop_exc:
            error(f"Cleanup stop failed (continuing): {stop_exc.message}")
    prune_home(scratch)
    shutil.rmtree(template_dir, ignore_errors=True)
    for stale in (hash_file, template_dir + ".tar.gz"):
        if os.path.exists(stale):
            os.remove(stale)
    os.rename(scratch, template_dir)
    content_hash = template_content_hash(template_dir)
    with open(hash_file, "w") as f:
        f.write(content_hash)
    success(f"Template {key} ready ({content_hash})")
    return template_dir, content_hash
