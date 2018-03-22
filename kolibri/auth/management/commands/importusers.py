import csv
import logging as logger
from functools import partial
from itertools import starmap

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction

from kolibri.auth.models import Facility
from kolibri.auth.models import FacilityUser

logging = logger.getLogger(__name__)

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
        except Facility.DoesNotExist:
            try:
                return Facility.objects.get(name=user['facility'])
            except Facility.DoesNotExist:
                raise CommandError('Facility matching identifier {facility} was not found'.format(facility=user['facility']))
    else:
        return default_facility

def create_user(i, user, default_facility=None):
    validate_username(user)

    if i == 0 and all(key == val or val is None for key, val in user.items()):
        # Check whether the first row is a header row or not
        # Either each key will be equal to the value
        # Or the header is not included in the CSV, so it is None
        return False

    facility = infer_facility(user, default_facility)
    try:
        username = user['username']
        FacilityUser.objects.get(username=username, facility=facility)
        logging.warn('Tried to create a user with the username {username} in facility {facility}, but one already exists'.format(
            username=username,
            facility=facility
        ))
        return False
    except FacilityUser.DoesNotExist:
        new_user = FacilityUser.objects.create(
            full_name=user.get('full_name', ''),
            username=username,
            facility=facility,
        )
        password = user.get('password', DEFAULT_PASSWORD)
        new_user.set_password(password)
        new_user.save()
        logging.info('User created with username {username} in facility {facility} with password {password}'.format(
            username=username,
            facility=facility,
            password=password,
        ))
        return True

class Command(BaseCommand):
    help = """
    Imports a user list from CSV file and creates
    them on a specified or the default facility.

    Requires CSV file data in this form:
    <full_name>,<username>,<password>,<facility>

    Less information can be passed if the headers are specified:
    full_name,username,password
    <full_name>,<username>,<password>

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

        fieldnames = ['full_name', 'username', 'password', 'facility']
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

        with open(options['filepath']) as f:
            reader = csv.DictReader(f, fieldnames=ordered_fieldnames, strict=True)
            with transaction.atomic():
                create_func = partial(create_user, default_facility=default_facility)
                total = sum(starmap(create_func, enumerate(reader)))
                logging.info('{total} users created'.format(total=total))
