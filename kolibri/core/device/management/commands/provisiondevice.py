import logging as logger

from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction
from django.utils import six

from kolibri.auth.constants.facility_presets import mappings
from kolibri.auth.constants.facility_presets import presets
from kolibri.auth.constants.role_kinds import ADMIN
from kolibri.auth.models import Facility
from kolibri.auth.models import FacilityUser
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings

logging = logger.getLogger(__name__)

def get_user_response(prompt, valid_answers=None):
    answer = None
    while not answer or (valid_answers is not None and answer.lower() not in valid_answers):
        answer = six.moves.input(prompt)
    return answer.lower()


languages = dict(settings.LANGUAGES)


def create_facility(options):
    if options['facility'] is None and options['interactive']:
        answer = get_user_response("Do you wish to create a facility? [yn] ", ["y", "n"])
        if answer == "y":
            options['facility'] = get_user_response("What do you wish to name your facility? ")

    if options['facility']:
        facility, created = Facility.objects.get_or_create(name=options['facility'])

        if not created:
            logging.warn("Facility with name {name} already exists, not modifying preset.".format(name=options['facility']))
            return facility

        logging.info("Facility with name {name} created.".format(name=options['facility']))

        if options['preset'] is None and options['interactive']:
            options['preset'] = get_user_response(
                "Which preset do you wish to use? [{presets}]: ".format(presets=",".join(presets.keys())),
                valid_answers=presets)

        # Only set preset data if we have created the facility, otherwise leave previous data intact
        if options['preset']:
            preset = options['preset']
            dataset_data = mappings[preset]
            for key, value in dataset_data.items():
                setattr(facility.dataset, key, value)
            facility.dataset.save()
            logging.info("Facility preset changed to {preset}.".format(preset=options['preset']))
    else:
        facility = Facility.get_default_facility() or Facility.objects.first()
        if not facility:
            raise CommandError('No facility exists')
    return facility


def create_superuser(options):
    if options['superusername'] is None and options['interactive']:
        options['superusername'] = get_user_response("Enter a username for the super user: ")

    if options['superuserpassword'] is None and options['interactive']:
        confirm = ""
        while options['superuserpassword'] != confirm:
            options['superuserpassword'] = get_user_response("Enter a password for the super user: ")
            confirm = get_user_response("Confirm password for the super user: ")

    if options['superusername'] and options['superuserpassword']:
        superuser, created = FacilityUser.objects.get_or_create(username=options['superusername'], facility=options['facility'])
        if created:
            logging.info("Superuser created with username {username}.".format(username=options['superusername']))
            superuser.set_password(options["superuserpassword"])
            superuser.save()
        else:
            logging.info("Setting user with username {username} as superuser.".format(username=options['superusername']))
        options['facility'].add_role(superuser, ADMIN)
        DevicePermissions.objects.create(user=superuser, is_superuser=True)


def create_device_settings(options):
    if options['language_id'] is None and options['interactive']:
        options['language_id'] = get_user_response(
            "Enter a default language code [{langs}]: ".format(langs=",".join(languages.keys())),
            valid_answers=languages)
    device_settings, created = DeviceSettings.objects.get_or_create()
    device_settings.is_provisioned = True
    device_settings.language_id = options['language_id'] or device_settings.language_id
    device_settings.default_facility = device_settings.default_facility or options['facility']
    device_settings.save()


class Command(BaseCommand):
    help = "Provision a device for use"

    def add_arguments(self, parser):
        parser.add_argument('--facility', action='store', type=str, help='Facility name to create')
        parser.add_argument('--superusername', action='store', type=str, help='Superuser username to create')
        parser.add_argument('--superuserpassword', action='store', type=str, help='Superuser password to create')
        parser.add_argument('--preset', action='store', type=str, help='Facility preset to use', choices=presets)
        parser.add_argument('--language_id', action='store', type=str, help='Language id for default language', choices=languages)
        parser.add_argument(
            '--noinput', '--no-input', action='store_false', dest='interactive', default=True,
            help='Tells Django to NOT prompt the user for input of any kind.',
        )

    def handle(self, *args, **options):
        with transaction.atomic():
            options['facility'] = create_facility(options)

            create_superuser(options)

            create_device_settings(options)
