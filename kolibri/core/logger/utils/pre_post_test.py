"""
Single authoritative implementation of get_synthetic_content_id, shared between
the learner-side logger API (kolibri.core.logger.api) and the coach-side unit
report API (kolibri.plugins.coach.viewsets.unit_report).
"""

import uuid

_PRE_POST_TEST_SYNTHETIC_CONTENT_ID_NAMESPACE = uuid.UUID(
    "7c9e4b1a-3d5f-4a8e-9c2b-6d0e1f2a3b4c"
)


def get_synthetic_content_id(course_session_id, unit_id, test_type):
    key = "{}:{}:{}".format(course_session_id, unit_id, test_type)
    return uuid.uuid5(_PRE_POST_TEST_SYNTHETIC_CONTENT_ID_NAMESPACE, key).hex
