import logging
import random
from itertools import permutations

from django.db.utils import IntegrityError

from kolibri.core.auth.constants.picture_passwords import PICTURE_PASSWORD_SET
from kolibri.core.auth.constants.picture_passwords import SEQUENCE_LENGTH
from kolibri.core.auth.errors import NoAvailableSequences
from kolibri.core.auth.errors import SequenceAlreadyAssigned
from kolibri.core.auth.models import FacilityUser


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
            "All picture password sequences have been assigned for this facility."
        )
    return random.choice(list(available))


def assign_picture_password(user, facility):
    """
    Assign a unique picture password sequence to the user.

    Handles IntegrityError (race condition where another request assigned
    the same sequence between our read and write) by retrying once.

    Raises:
        NoAvailableSequences: if no remaining sequences are available for facility.
        SequenceAlreadyAssigned: if we hit IntegrityError twice during assignment.
    """
    sequence = get_available_sequence(facility)

    try:
        user.picture_password = sequence
        user.save(update_fields=["picture_password"])
    except IntegrityError:
        logger.warning("Picture password collision for user %s, retrying.", user.id)
        sequence = get_available_sequence(facility)
        user.picture_password = sequence
        try:
            user.save(update_fields=["picture_password"])
        except IntegrityError as e:
            raise SequenceAlreadyAssigned(
                "Picture password sequence assignment failed due to repeated collisions."
            ) from e
