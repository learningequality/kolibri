import logging
import random
from itertools import permutations

from django.db import transaction
from django.db.models.functions import Coalesce
from django.db.utils import IntegrityError

from kolibri.core.auth.constants.picture_passwords import LEARNER_PICTURE_PASSWORD_LIMIT
from kolibri.core.auth.constants.picture_passwords import PICTURE_PASSWORD_SET
from kolibri.core.auth.constants.picture_passwords import SEQUENCE_LENGTH
from kolibri.core.auth.errors import NoAvailableSequences
from kolibri.core.auth.errors import SequenceAlreadyAssigned
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.utils.cache import process_cache as cache

logger = logging.getLogger(__name__)


class LearnerCounterCache(object):
    """
    Learner calculation specifically for picture password login since only learners who have no role
    and are not superusers should be included
    """

    key = "learner_count_{dataset_id}"
    timeout = 300

    def count(self, dataset_id):
        """
        Queries for the quantity of learners in a particular facility given its dataset ID

        :param dataset_id: The ID of the facility dataset
        :type dataset_id: str
        :return: The number of learners in the facility (associated with the dataset)
        :rtype: int
        """
        return (
            FacilityUser.objects.annotate(
                is_superuser=Coalesce("devicepermissions__is_superuser", False),
            )
            .filter(
                dataset_id=dataset_id,
                roles__isnull=True,
                is_superuser=False,
            )
            .count()
        )

    def clear(self, dataset_id=None):
        """
        Clears the cache entry for the specified dataset, or all datasets if none specified.

        :param dataset_id: The ID of the dataset to clear from the cache.
        :type dataset_id: str|None
        """
        dataset_ids = []
        if dataset_id is not None:
            dataset_ids.append(dataset_id)
        else:
            dataset_ids = Facility.objects.values_list(
                "dataset_id", flat=True
            ).distinct()

        for dataset_id in dataset_ids:
            key = self.key.format(dataset_id=dataset_id)
            cache.delete(key)

    def __call__(self, dataset_id):
        """
        Queries for the quantity of learners in a particular facility given its dataset ID

        :param dataset_id: The ID of the dataset whose count needs to be retrieved.
        :type dataset_id: str
        :return: The number of learners in the facility (associated with the dataset)
        :rtype: int
        """
        key = self.key.format(dataset_id=dataset_id)
        count = cache.get(key)
        if count is None:
            count = self.count(dataset_id)
            cache.set(key, count, self.timeout)
        return count


get_learner_count = LearnerCounterCache()


def are_picture_passwords_exhausted(dataset_id):
    """
    Determines whether the maximum number of picture passwords have been granted for a
    given facility dataset.

    :param dataset_id: The ID of the facility dataset to check
    :type dataset_id: str
    :return: `True` if the number of picture passwords has reached the defined limit
    :rtype: bool
    """
    return get_learner_count(dataset_id) >= LEARNER_PICTURE_PASSWORD_LIMIT


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

    Soft-deleted learners are included: they keep their picture_password until
    they are hard-deleted, so it still occupies the (dataset, picture_password)
    unique constraint and is not free to hand out.
    """
    return set(
        FacilityUser.all_objects.filter(
            facility=facility,
            roles__isnull=True,
            picture_password__isnull=False,
        ).values_list("picture_password", flat=True)
    )


def _reclaim_sequence_from_deleted_learner(user, facility):
    """
    Move the sequence held by the learner deleted longest ago onto the user.

    Soft-deleted learners keep their picture password so it is still theirs if
    they are restored, so once every sequence is spoken for the only way to
    assign another is to take one back. The learner deleted longest ago is the
    one least likely to want theirs again.
    """
    holder = (
        FacilityUser.all_objects.filter(
            facility=facility,
            roles__isnull=True,
            picture_password__isnull=False,
            date_deleted__isnull=False,
        )
        .order_by("date_deleted", "id")
        .first()
    )
    if holder is None:
        raise NoAvailableSequences(
            "All picture password sequences have been assigned for this facility."
        )
    with transaction.atomic():
        user.picture_password = holder.picture_password
        holder.picture_password = None
        holder.save(update_fields=["picture_password"])
        user.save(update_fields=["picture_password"])


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

    When every sequence is taken, takes back the one held by the learner
    deleted longest ago.

    Handles IntegrityError (race condition where another request assigned
    the same sequence between our read and write) by retrying once.

    Raises:
        NoAvailableSequences: if no sequence is free and none can be reclaimed.
        SequenceAlreadyAssigned: if we hit IntegrityError twice during assignment.
    """
    try:
        sequence = get_available_sequence(facility)
    except NoAvailableSequences:
        _reclaim_sequence_from_deleted_learner(user, facility)
        return

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
