from contextlib import contextmanager

from django.db import connections
from django.db import router
from django.db.utils import OperationalError

from kolibri.core.auth.models import FacilityUser


def create_learner(username, password, facility, classroom=None, learner_group=None):
    """
    Create a facility learner.
    Assign them a classroom if specified.
    Assign them a learner group if specified.
    """

    learner = FacilityUser.objects.create(username=username, facility=facility)
    learner.set_password(password)
    learner.save()

    if classroom is not None:
        classroom.add_member(learner)

    if learner_group is not None:
        learner_group.add_member(learner)

    return learner


def create_coach(username, password, facility, classroom=None, is_facility_coach=False):
    """
    Create a coach.
    Assign them a classroom if specified.
    Grant facility permissions if is_facility_coach is True.
    """

    coach = FacilityUser.objects.create(username=username, facility=facility)
    coach.set_password(password)
    coach.save()

    if classroom is not None:
        classroom.add_coach(coach)

    if is_facility_coach:
        facility.add_coach(coach)

    return coach


def create_facility_admin(username, password, facility):
    """
    Create a facility admin.
    """

    admin = FacilityUser.objects.create(username=username, facility=facility)
    admin.set_password(password)
    admin.save()

    facility.add_admin(admin)

    return admin


@contextmanager
def failing_first_read_on(model):
    table = model._meta.db_table
    failed = False

    def fail(execute, sql, params, many, context):
        nonlocal failed
        if not failed and sql.startswith("SELECT") and table in sql:
            failed = True
            raise OperationalError("disk I/O error")
        return execute(sql, params, many, context)

    with connections[router.db_for_read(model)].execute_wrapper(fail):
        yield
