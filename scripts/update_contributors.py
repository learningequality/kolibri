#!/usr/bin/env python3
"""Update AUTHORS.md with contributor logins from merged pull requests.

Pages merged PRs in the repository, drops bot accounts and logins already
listed, and appends a row for each new contributor with their GitHub display
name (or `-` if unset).

Pass `--since-days N` to limit the scan to PRs updated in the last N days
(used by the scheduled monthly run); omit it for a full backfill.

Set `GITHUB_TOKEN` to authenticate the API calls.
"""

import argparse
import datetime as dt
import json
import os
import pathlib
import re
import sys
import urllib.request

REPO = "learningequality/kolibri"
API = "https://api.github.com"
AUTHORS_PATH = pathlib.Path(__file__).resolve().parent.parent / "AUTHORS.md"
ROW_RE = re.compile(r"^\|[^|]*\|\s*([A-Za-z0-9][A-Za-z0-9-]*)\s*\|\s*$")

# Legacy bot accounts that don't carry the GitHub App `[bot]` suffix.
BOT_LOGINS = frozenset({"pyup-bot", "rtibblesbot"})


def github_request(url):
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "kolibri-update-contributors",
        },
    )
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req) as resp:
        body = json.loads(resp.read())
        link = resp.headers.get("Link", "") or ""
    next_url = None
    for part in link.split(","):
        if 'rel="next"' in part:
            m = re.search(r"<([^>]+)>", part)
            if m:
                next_url = m.group(1)
    return body, next_url


def existing_logins(text):
    return {
        m.group(1).lower()
        for line in text.splitlines()
        for m in [ROW_RE.match(line)]
        if m
    }


def iter_new_pr_authors(existing, since_iso=None):
    """Yield logins of merged-PR authors not in `existing`.

    Iterates PRs updated-desc so we can stop early once we cross `since_iso`.
    Sorting by `updated` (not `created`) ensures we don't miss PRs opened long
    ago but merged inside the window — `updated_at >= merged_at` always.
    """
    seen = set()
    url = (
        f"{API}/repos/{REPO}/pulls"
        "?state=closed&per_page=100&sort=updated&direction=desc"
    )
    while url:
        page, url = github_request(url)
        for pr in page:
            if since_iso and pr.get("updated_at", "") < since_iso:
                return
            if not pr.get("merged_at"):
                continue
            user = pr.get("user") or {}
            login = user.get("login")
            if not login or login.endswith("[bot]"):
                continue
            key = login.lower()
            if key in BOT_LOGINS:
                continue
            if key in seen or key in existing:
                continue
            seen.add(key)
            yield login


def lookup_name(login):
    user, _ = github_request(f"{API}/users/{login}")
    return user.get("name") or "-"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--since-days",
        type=int,
        default=None,
        help="Only scan PRs updated in the last N days (default: scan all).",
    )
    args = parser.parse_args()

    since_iso = None
    if args.since_days is not None:
        since_iso = (
            dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=args.since_days)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")

    text = AUTHORS_PATH.read_text(encoding="utf-8")
    existing = existing_logins(text)
    rows = []
    for login in iter_new_pr_authors(existing, since_iso):
        name = lookup_name(login)
        sys.stdout.write(f"+ {name} | {login}\n")
        rows.append(f"| {name} | {login} |")
    rows.reverse()  # chronological: oldest contributor first

    if not rows:
        sys.stdout.write("No new contributors.\n")
        return
    if not text.endswith("\n"):
        text += "\n"
    AUTHORS_PATH.write_text(text + "\n".join(rows) + "\n", encoding="utf-8")
    sys.stdout.write(f"Added {len(rows)} contributor(s).\n")


if __name__ == "__main__":
    main()
