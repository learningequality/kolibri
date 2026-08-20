"""
Data-building routines that the integration tests run inside a spawned server.

Each one is executed by ``KolibriServer.run_scenario``, in the server's own
process and against its own database, so models are created through the normal
ORM path that Morango's ``save()`` hooks depend on. Grouping a scenario's
creates into one function is what makes that affordable: the alternative is a
separate ``kolibri shell`` startup per model.

Anything a caller needs back is looked up afterwards through the server's db
alias, so these return nothing.
"""

from ..models import Classroom
from ..models import FacilityUser
from ..models import LearnerGroup
from ..models import Membership
from ..models import Role
from .helpers import DUMMY_PASSWORD


def create_admin_learner_classroom(
    facility_id, admin_username, learner_username, classroom_name, group_name
):
    """
    An admin and a learner, plus a classroom and learner group the learner
    belongs to. Passwords are set as raw field values, matching what the tests
    did when each of these was its own create call.
    """
    admin = FacilityUser.objects.create(
        username=admin_username, password=DUMMY_PASSWORD, facility_id=facility_id
    )
    learner = FacilityUser.objects.create(
        username=learner_username, password=DUMMY_PASSWORD, facility_id=facility_id
    )
    classroom = Classroom.objects.create(parent_id=facility_id, name=classroom_name)
    group = LearnerGroup.objects.create(parent_id=classroom.id, name=group_name)
    Membership.objects.create(user_id=learner.id, collection_id=classroom.id)
    Membership.objects.create(user_id=learner.id, collection_id=group.id)
    Role.objects.create(collection_id=facility_id, user_id=admin.id, kind="admin")
