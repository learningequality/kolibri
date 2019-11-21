"""
Helper functions for use across the user/auth/permission-related tests.
"""
from ..models import Classroom
from ..models import Facility
from ..models import FacilityDataset
from ..models import FacilityUser
from ..models import LearnerGroup
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.utils import provision_device  # noqa

DUMMY_PASSWORD = "password"


def create_superuser(facility, username="superuser"):
    superuser = FacilityUser.objects.create(username=username, facility=facility)
    superuser.set_password(DUMMY_PASSWORD)
    superuser.save()
    DevicePermissions.objects.create(user=superuser, is_superuser=True)
    return superuser


def setup_device():
    # Test helper to return a facility and superuser
    facility = Facility.objects.create(name="Test")
    superuser = create_superuser(facility)
    provision_device()
    return facility, superuser


def create_dummy_facility_data(
    allow_sign_ups=False, classroom_count=2, learnergroup_count=2
):
    """
    Helper to bootstrap facility data for use in role/permission scenarios (collections, users, and roles).
    This can be called multiple times to create parallel facilities/datasets in the same database, to test
    cross-dataset permissions. Returns a dict containing objects and lists of objects that were created.

    :param int classroom_count: (optional), the number of classrooms to create in the facility (defaults to 2)
    :param int classroom_count: (optional), the number of learner groups to create in each classroom (defaults to 2)
    :returns: a dictionary of objects (users, collections, etc) for a dummy facility
    :rtype: dict
    """

    data = {}

    # create the dataset object with which this data will be associated
    dataset = data["dataset"] = FacilityDataset.objects.create(
        learner_can_sign_up=allow_sign_ups
    )

    # create the Collection hierarchy
    facility = data["facility"] = Facility.objects.create(dataset=dataset)
    data["classrooms"] = [
        Classroom.objects.create(parent=facility) for i in range(classroom_count)
    ]
    data["learnergroups"] = []
    for classroom in data["classrooms"]:
        lgs = [
            LearnerGroup.objects.create(parent=classroom)
            for i in range(learnergroup_count)
        ]
        data["learnergroups"].append(lgs)

    # create the users
    data["superuser"] = create_superuser(facility)
    data["facility_admin"] = FacilityUser.objects.create(
        username="facadmin", password="***", facility=facility
    )
    data["facility_coach"] = FacilityUser.objects.create(
        username="faccoach", password="***", facility=facility
    )
    data["classroom_admins"] = [
        FacilityUser.objects.create(
            username="classadmin%d" % i, password="***", facility=facility
        )
        for i, classroom in enumerate(data["classrooms"])
    ]
    data["classroom_coaches"] = [
        FacilityUser.objects.create(
            username="classcoach%d" % i, password="***", facility=facility
        )
        for i, classroom in enumerate(data["classrooms"])
    ]
    data["learner_all_groups"] = FacilityUser.objects.create(
        username="learnerag", password="***", facility=facility
    )
    data["learners_one_group"] = []
    for i, classroom_list in enumerate(data["learnergroups"]):
        data["learners_one_group"].append([])
        for j, group in enumerate(classroom_list):
            learner = FacilityUser.objects.create(
                username="learnerclass%dgroup%d" % (i, j),
                password="***",
                facility=facility,
            )
            data["learners_one_group"][i].append(learner)
            group.add_learner(learner)
            group.add_learner(data["learner_all_groups"])

    data["unattached_users"] = [
        FacilityUser.objects.create(
            username="orphan%d" % i, password="*", facility=facility
        )
        for i in range(3)
    ]

    data["all_users"] = data["facility"].get_members()
    data["all_collections"] = (
        [data["facility"]] + data["classrooms"] + sum(data["learnergroups"], [])
    )

    # create Roles linking users with Collections
    facility.add_admin(data["facility_admin"])
    facility.add_coach(data["facility_coach"])
    for classroom, admin, coach in zip(
        data["classrooms"], data["classroom_admins"], data["classroom_coaches"]
    ):
        classroom.add_admin(admin)
        classroom.add_coach(coach)

    return data
