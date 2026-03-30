import json
import logging
import random
from itertools import permutations
from pathlib import Path

from django.db.utils import IntegrityError
from rest_framework import status
from rest_framework.response import Response

from kolibri.core.auth.errors import NoAvailableSequences
from kolibri.core.auth.models import FacilityUser

# mapping of integer IDs to KDS icon names for picture-based login.
#
# IMPORTANT — treat this mapping as an append-only registry:
#   IDs are immutable once assigned.
#   Pictures can be added but NEVER removed or reassigned.
#   Changing or removing an ID would invalidate stored sequences
#   or point them to the wrong picture.
PICTURE_PASSWORD_SET = {
    int(key): value
    for key, value in json.loads(
        (
            Path(__file__).resolve().parent.parent
            / "constants"
            / "picture_passwords_set.json"
        ).read_text()
    ).items()
}

SEQUENCE_LENGTH = 3

logger = logging.getLogger(__name__)


def get_all_valid_sequences(picture_set):
    """
    Generate all valid ordered sequences of SEQUENCE_LENGTH pictures
    from the given picture set, returned as a set of dot-separated strings.
    """
    ids = picture_set.keys()
    return {
        ".".join(str(pic_id) for pic_id in seq)
        for seq in permutations(ids, SEQUENCE_LENGTH)
    }


def get_assigned_sequences(facility):
    """
    Return the set of picture_password values already assigned to
    learners in the facility. Coaches and admins are excluded.
    """
    return set(
        FacilityUser.objects.filter(
            facility=facility,
            roles__isnull=True,
            picture_password__isnull=False,
        ).values_list("picture_password", flat=True)
    )


def get_available_sequence(facility):
    """
    Pick a random unassigned sequence for the facility.
    Raises NoAvailableSequences if every possible sequence is taken.
    """
    all_sequences = get_all_valid_sequences(PICTURE_PASSWORD_SET)
    assigned = get_assigned_sequences(facility)
    available = all_sequences - assigned
    if not available:
        raise NoAvailableSequences(
            "All picture password sequences have been assigned " "for this facility."
        )
    return random.choice(list(available))


def assign_picture_password(user, facility):
    """
    Assign a unique picture password sequence to the user.

    Handles IntegrityError (race condition where another request assigned
    the same sequence between our read and write) by retrying once.
    Returns an HTTP 400 response if no sequences are available.
    """
    try:
        sequence = get_available_sequence(facility)
    except NoAvailableSequences:
        return Response(
            {"detail": "No available picture password sequences for this facility."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user.picture_password = sequence
        user.save(update_fields=["picture_password"])
    except IntegrityError:
        logger.warning("Picture password collision for user %s, retrying.", user.id)
        try:
            sequence = get_available_sequence(facility)
        except NoAvailableSequences:
            return Response(
                {
                    "detail": "No available picture password sequences for this facility."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.picture_password = sequence
        user.save(update_fields=["picture_password"])
