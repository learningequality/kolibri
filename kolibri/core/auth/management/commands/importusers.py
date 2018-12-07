import csv
import logging
from functools import partial
from itertools import starmap

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser

logger = logging.getLogger(__name__)


DEFAULT_PASSWORD = "kolibri"


def validate_username(user):
    # Check if username is specified, if not, throw an error
    if 'username' not in user or user['username'] is None:
        raise CommandError('No usernames specified, this is required for user creation')


def infer_facility(user, default_facility):
    if 'facility' in user and user['facility']:
        try:
            # Try lookup by id first, then name
            return Facility.objects.get(pk=user['facility'])
        except (Facility.DoesNotExist, ValueError):
            try:
                return Facility.objects.get(name=user['facility'])
            except Facility.DoesNotExist:
                raise CommandError('Facility matching identifier {facility} was not found'.format(facility=user['facility']))
    else:
        return default_facility


def infer_and_create_class(user, facility):
    if 'class' in user and user['class']:
        try:
            # Try lookup by id first, then name
            classroom = Classroom.objects.get(pk=user['class'], parent=facility)
        except (Classroom.DoesNotExist, ValueError):
            try:
                classroom = Classroom.objects.get(name=user['class'], parent=facility)
            except Classroom.DoesNotExist:
                classroom = Classroom.objects.create(name=user['class'], parent=facility)
        return classroom


def create_user(i, user, default_facility=None):
    validate_username(user)

    if i == 0 and all(key == val or val is None for key, val in user.items()):
        # Check whether the first row is a header row or not
        # Either each key will be equal to the value
        # Or the header is not included in the CSV, so it is None
        return False

    facility = infer_facility(user, default_facility)
    classroom = infer_and_create_class(user, facility)
    username = user['username']
    try:
        user_obj = FacilityUser.objects.get(username=username, facility=facility)
        logger.warn('Tried to create a user with the username {username} in facility {facility}, but one already exists'.format(
            username=username,
            facility=facility
        ))
        if classroom:
            classroom.add_member(user_obj)
        return False
    except FacilityUser.DoesNotExist:
        password = user.get('password', DEFAULT_PASSWORD) or DEFAULT_PASSWORD
        try:
            new_user = FacilityUser.objects.create_user(
                full_name=user.get('full_name', ''),
                username=username,
                facility=facility,
                password=password,
            )
            if classroom:
                classroom.add_member(new_user)
            logger.info('User created with username {username} in facility {facility} with password {password}'.format(
                username=username,
                facility=facility,
                password=password,
            ))
            return True
        except ValidationError as e:
            logger.error('User not created with username {username} in facility {facility} with password {password}'.format(
                username=username,
                facility=facility,
                password=password,
            ))
            for key, error in e.message_dict.items():
                logger.error('{key}: {error}'.format(key=key, error=error[0]))
            return False


class Command(BaseCommand):
    help = """
    Imports a user list from CSV file and creates
    them on a specified or the default facility.

    Requires CSV file data in this form:
    <full_name>,<username>,<password>,<facility>,<class>

    Less information can be passed if the headers are specified:
    full_name,username,password,class
    <full_name>,<username>,<password>,<class>

    Or in a different order:
    username,full_name
    <username>,<full_name>

    At minimum the username is required.
    The password will be set to '{DEFAULT_PASSWORD}' if none is set.
    The facility can be either the facility id or the facility name.
    If no facility is given, either the default facility,
    or the facility specified with the --facility commandline argument will be used.
    """.format(DEFAULT_PASSWORD=DEFAULT_PASSWORD)

    def add_arguments(self, parser):
        parser.add_argument('filepath', action='store', help='Path to CSV file.')
        parser.add_argument('--facility', action='store', type=str, help='Facility id to import the users into')

    def handle(self, *args, **options):
        if options['facility']:
            default_facility = Facility.objects.get(pk=options['facility'])
        else:
            default_facility = Facility.get_default_facility()

        if not default_facility:
            raise CommandError('No default facility exists, please make sure to provision this device before running this command')

        fieldnames = ['full_name', 'username', 'password', 'facility', 'class']
        # open using default OS encoding
        with open(options['filepath']) as f:
            header = next(csv.reader(f, strict=True))
            if all(col in fieldnames for col in header):
                # Every item in the first row matches an item in the fieldnames, it is a header row
                if 'username' not in header:
                    raise CommandError('No usernames specified, this is required for user creation')
                ordered_fieldnames = header
            elif any(col in fieldnames for col in header):
                raise CommandError('Mix of valid and invalid header labels found in first row')
            else:
                ordered_fieldnames = fieldnames

        # open using default OS encoding
        with open(options['filepath']) as f:
            reader = csv.DictReader(f, fieldnames=ordered_fieldnames, strict=True)
            with transaction.atomic():
                create_func = partial(create_user, default_facility=default_facility)
                total = sum(starmap(create_func, enumerate(reader)))
                logger.info('{total} users created'.format(total=total))
