import hashlib  # used by get_test_version (canonical A/B split definition)
import uuid
from collections import defaultdict

from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Subquery
from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.response import Response

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import CourseSessionAssignment
from kolibri.core.courses.models import TestStatus
from kolibri.core.courses.models import UnitTestAssignment
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import MasteryLog

# Conservative upper bound for SQL IN-clause list lengths.  SQLite's default
# SQLITE_MAX_VARIABLE_NUMBER is 999; staying under 900 leaves headroom for
# other bind parameters in the same query.
_IN_CHUNK_SIZE = 900


def _chunked(lst, size):
    """Yield successive sublists of at most *size* items."""
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


# Private namespace UUID for synthetic content_id generation (issue #14133).
# Generated once with uuid.uuid4() and pinned here.  Using a project-private
# namespace prevents collisions with IDs produced by any code that happens to
# use the same uuid5(key) pattern over one of the well-known standard namespaces
# (NAMESPACE_DNS, NAMESPACE_URL, etc.).
_SYNTHETIC_CONTENT_ID_NAMESPACE = uuid.UUID("7c9e4b1a-3d5f-4a8e-9c2b-6d0e1f2a3b4c")

# Status strings returned by _get_test_status and surfaced in the API response.
# Exported as constants so callers can import them instead of duplicating literals.
TEST_STATUS_NOT_ACTIVATED = "not_activated"
TEST_STATUS_OPEN = "open"
TEST_STATUS_CLOSED = "closed"


def get_test_version(learner_id, course_session_id, unit_contentnode_id):
    """
    Returns 'a' or 'b' based on a deterministic hash of
    (learner_id, course_session_id, unit_contentnode_id).
    Implements the A/B split logic defined in issue #14133.

    This function is the canonical definition shared by the learner-side client
    (which imports it to decide which item set to present) and by server-side
    tests.  The coach report API itself does not call it directly — instead it
    queries for both synthetic content_ids (pre and post, versions a and b) in a
    single pass — but it must live here so that both sides stay in sync.
    """
    key = "{}:{}:{}".format(learner_id, course_session_id, unit_contentnode_id)
    hash_byte = hashlib.sha256(key.encode()).digest()[0]
    return "a" if hash_byte < 128 else "b"


def get_synthetic_content_id(learner_id, course_session_id, unit_contentnode_id, test_type):
    """
    Generate a deterministic UUID5 content_id for MasteryLog/AttemptLog tracking.
    Must match the generation logic used on the learner side (issue #14133).
    """
    key = "{}:{}:{}:{}".format(
        learner_id, course_session_id, unit_contentnode_id, test_type
    )
    return uuid.uuid5(_SYNTHETIC_CONTENT_ID_NAMESPACE, key).hex
