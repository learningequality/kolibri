#!/usr/bin/env python3
"""
Check that reusable workflow callers grant the permissions their callees request.

GitHub validates `permissions:` when it loads a workflow, before any job starts.
A called workflow may not request a scope its calling job lacks, or the whole run
aborts with `startup_failure` — no jobs, no logs, and for release workflows that
means finding out only once a release is published.

Two rules make this easy to get wrong:

- A job-level `permissions:` block REPLACES the workflow-level one rather than
  merging with it. A job declaring one scope has every other scope set to `none`,
  so an override must restate everything its callee needs.
- A callee's own workflow-level block is validated against the caller too, even
  when every job in the callee overrides it.

Only calls to local workflows (`uses: ./.github/workflows/x.yml`) are checked.
Calls to other repositories cannot be resolved offline. Calling jobs with no
explicit `permissions:` anywhere are skipped: the grant is then the repo-level
default token setting, which is not readable from the workflow files.

Delete this hook once actionlint ships the same check, which would let it run as
part of the existing actionlint hook:
https://github.com/rhysd/actionlint/pull/670 (tracked by issue #552).
"""

import glob
import logging
import sys

import yaml

WORKFLOW_GLOBS = (".github/workflows/*.yml", ".github/workflows/*.yaml")

LEVELS = {"none": 0, "read": 1, "write": 2}

ALL_SCOPES = (
    "actions",
    "attestations",
    "checks",
    "contents",
    "deployments",
    "discussions",
    "id-token",
    "issues",
    "packages",
    "pages",
    "pull-requests",
    "repository-projects",
    "security-events",
    "statuses",
)


def normalise(permissions):
    """
    Expand a `permissions:` value into {scope: level}.

    Returns None when the key is absent, which means "inherit" rather than
    "nothing granted". Scopes missing from an explicit block are `none`.
    """
    if permissions is None:
        return None
    if isinstance(permissions, str):
        if permissions == "write-all":
            return {scope: "write" for scope in ALL_SCOPES}
        if permissions == "read-all":
            return {scope: "read" for scope in ALL_SCOPES}
        return dict.fromkeys(ALL_SCOPES, "none")
    expanded = dict.fromkeys(ALL_SCOPES, "none")
    expanded.update(permissions)
    return expanded


def granted_by(workflow, job):
    """Permissions available to a job: its own block, else the workflow's."""
    own = normalise(job.get("permissions"))
    if own is not None:
        return own
    return normalise(workflow.get("permissions"))


def requested_by(callee):
    """
    Every permission set the callee subjects to validation.

    The callee's workflow-level block counts even when all of its jobs override
    it, so it is yielded in its own right alongside each job's effective set.
    """
    workflow_level = normalise(callee.get("permissions"))
    if workflow_level is not None:
        yield "workflow-level permissions", workflow_level
    for job_id, job in (callee.get("jobs") or {}).items():
        own = normalise(job.get("permissions"))
        effective = own if own is not None else workflow_level
        if effective is not None:
            yield "job '{}'".format(job_id), effective


def local_callee(job):
    """The workflow path a job calls, if it calls a local reusable workflow."""
    uses = job.get("uses")
    if not isinstance(uses, str) or not uses.startswith("./"):
        return None
    return uses[2:] if uses.endswith((".yml", ".yaml")) else None


def shortfalls(grant, requested):
    """Scopes the callee requests more strongly than the caller grants."""
    return [
        (scope, level)
        for scope, level in requested.items()
        if LEVELS.get(level, 0) > LEVELS.get(grant.get(scope, "none"), 0)
    ]


def load_workflows():
    workflows = {}
    for pattern in WORKFLOW_GLOBS:
        for path in glob.glob(pattern):
            with open(path) as handle:
                workflows[path] = yaml.safe_load(handle) or {}
    return workflows


def find_failures(workflows):
    """Every scope a local reusable workflow call needs but is not granted."""
    failures = []
    for path, workflow in sorted(workflows.items()):
        for job_id, job in (workflow.get("jobs") or {}).items():
            callee_path = local_callee(job)
            if callee_path is None or callee_path not in workflows:
                continue
            grant = granted_by(workflow, job)
            if grant is None:
                continue
            for source, requested in requested_by(workflows[callee_path]):
                for scope, level in shortfalls(grant, requested):
                    failures.append(
                        (path, job_id, callee_path, source, scope, level, grant)
                    )
    return failures


def main():
    logging.basicConfig(level=logging.ERROR, format="%(message)s", stream=sys.stderr)
    logger = logging.getLogger(__name__)

    failures = find_failures(load_workflows())
    if not failures:
        return 0

    logger.error("Reusable workflow calls request permissions the caller lacks:")
    for path, job_id, callee, source, scope, level, grant in failures:
        logger.error("")
        logger.error("  %s: job '%s'", path, job_id)
        logger.error("    calls %s", callee)
        logger.error("    its %s needs '%s: %s'", source, scope, level)
        logger.error(
            "    the calling job grants '%s: %s'", scope, grant.get(scope, "none")
        )
    logger.error("")
    logger.error(
        "Grant the scope on the calling job, or drop it from the callee if unused."
    )
    logger.error(
        "A job-level block replaces the workflow-level one, so an override must"
    )
    logger.error("restate every scope its callee needs.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
