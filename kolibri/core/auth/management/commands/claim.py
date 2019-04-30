from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from morango.certificates import Certificate
from requests.exceptions import RequestException

from kolibri.core.auth.models import Facility
from kolibri.core.utils.portal import claim


class Command(BaseCommand):
    help = "Allows claiming of facilities which have been synced to a portal server."

    def add_arguments(self, parser):
        parser.add_argument(
            "token", action="store", type=str, help="Token of project"
        )
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="ID of facility to claim",
        )

    def handle(self, *args, **options):
        facility_id = options['facility']
        token = options['token']

        # try to get a valid facility to claim
        if facility_id:
            try:
                facility = Facility.objects.get(id=facility_id)
            except Facility.DoesNotExist:
                raise CommandError(
                    'Facility with ID {} does not exist'.format(facility_id)
                )
        # if no id passed in, assume only one facility on device
        else:
            try:
                facility = Facility.objects.get()
            except Facility.MultipleObjectsReturned:
                raise CommandError(
                    ('There are multiple facilities on this device.'
                     'Please pass in a facility ID to claim.')
                )

        # claim the facility
        try:
            claim(token, facility)
            self.stdout.write('Facility: {} has been successfully claimed.'.format(facility.name))
        except Certificate.DoesNotExist:
            raise CommandError(
                'This device does not own a certificate for Facility: {}'.format(facility.name)
            )
        # an invalid nonce/claim response
        except RequestException as e:
            raise CommandError(e)
