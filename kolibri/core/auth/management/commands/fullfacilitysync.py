import getpass
import sys

import requests
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.validators import URLValidator
from django.urls import reverse
from django.utils.six.moves import input
from morango.certificates import Certificate
from morango.certificates import Filter
from morango.certificates import ScopeDefinition
from morango.controller import MorangoProfileController
from morango.models import InstanceIDModel
from requests.exceptions import ConnectionError
from six.moves.urllib.parse import urljoin

from kolibri.core.auth.constants.morango_scope_definitions import FULL_FACILITY
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.utils import device_provisioned
from kolibri.core.tasks.management.commands.base import AsyncCommand


class Command(AsyncCommand):

    def add_arguments(self, parser):
        parser.add_argument('--dataset-id', type=str)
        parser.add_argument('--no-push', type=bool, default=False)
        parser.add_argument('--no-pull', type=bool, default=False)
        parser.add_argument('--base-url', type=str)
        parser.add_argument('--username', type=str)
        parser.add_argument('--password', type=str)

    def get_dataset_id(self, base_url, dataset_id):
        # get list of facilities and if more than 1, display all choices to user
        facility_url = urljoin(base_url, reverse('kolibri:core:publicfacility-list'))
        facility_resp = requests.get(facility_url)
        facility_resp.raise_for_status()
        facilities = facility_resp.json()
        if len(facilities) > 1 and not dataset_id:
            message = 'Please choose a facility to sync with:\n'
            for idx, f in enumerate(facilities):
                message += "{}. {}\n".format(idx + 1, f['name'])
            idx = input(message)
            dataset_id = facilities[int(idx - 1)]["dataset"]
        elif not dataset_id:
            dataset_id = facilities[0]['dataset']
        return dataset_id

    def get_client_and_server_certs(self, username, password, dataset_id, nc):
        # get servers certificates which server has a private key for
        server_certs = nc.get_remote_certificates(dataset_id, scope_def_id=FULL_FACILITY)
        if not server_certs:
            print('Server does not have any certificates for dataset_id: {}'.format(dataset_id))
            sys.exit(1)
        server_cert = server_certs[0]

        # check for the certs we own for the specific facility
        owned_certs = Certificate.objects.filter(id=dataset_id) \
                                         .get_descendants(include_self=True) \
                                         .filter(scope_definition_id=FULL_FACILITY) \
                                         .exclude(_private_key=None)

        # if we don't own any certs, do a csr request
        if not owned_certs:

            # prompt user for creds if not already specified
            if not username or not password:
                username = input('Please enter username: ')
                password = getpass.getpass('Please enter password: ')
            client_cert = nc.certificate_signing_request(server_cert, FULL_FACILITY, {'dataset_id': dataset_id},
                                                         userargs=username, password=password)
        else:
            client_cert = owned_certs[0]

        return client_cert, server_cert, username

    def create_superuser_and_provision_device(self, username, dataset_id):
        # Prompt user to pick a superuser if one does not currently exist
        while not DevicePermissions.objects.filter(is_superuser=True).exists():
            # specify username of account that will become a superuser
            if not username:
                username = input('Please enter username of account that will become the superuser on this device: ')
            if not FacilityUser.objects.filter(username=username).exists():
                print("User with username {} does not exist".format(username))
                username = None
                continue

            # make the user with the given credentials, a superuser for this device
            user = FacilityUser.objects.get(username=username, dataset_id=dataset_id)

            # create permissions for the authorized user
            DevicePermissions.objects.update_or_create(user=user, defaults={'is_superuser': True, 'can_manage_content': True})

        # if device has not been provisioned, set it up
        if not device_provisioned():
            device_settings, created = DeviceSettings.objects.get_or_create()
            device_settings.is_provisioned = True
            device_settings.save()

    def handle_async(self, *args, **options):
        # validate url that is passed in
        try:
            URLValidator()((options['base_url']))
        except ValidationError:
            print('Base-url is not valid. Please retry command and enter a valid url.')
            sys.exit(1)

        # call this in case user directly syncs without migrating database
        if not ScopeDefinition.objects.filter():
            call_command("loaddata", "scopedefinitions")

        # ping server at url with info request
        info_url = urljoin(options['base_url'], 'api/morango/v1/morangoinfo/1/')
        try:
            info_resp = requests.get(info_url)
        except ConnectionError:
            print('Can not connect to server with base-url: {}'.format(options['base_url']))
            sys.exit(1)

        # if instance_ids are equal, this means device is trying to sync with itself, which we don't allow
        if InstanceIDModel.get_or_create_current_instance()[0].id == info_resp.json()['instance_id']:
            print('Device can not sync with itself. Please re-check base-url and try again.')
            sys.exit(1)

        controller = MorangoProfileController('facilitydata')
        with self.start_progress(total=7) as progress_update:
            network_connection = controller.create_network_connection(options['base_url'])
            progress_update(1)

            options['dataset_id'] = self.get_dataset_id(options['base_url'], options['dataset_id'])
            progress_update(1)

            client_cert, server_cert, options['username'] = self.get_client_and_server_certs(options['username'], options['password'],
                                                                                             options['dataset_id'], network_connection)
            progress_update(1)

            sync_client = network_connection.create_sync_session(client_cert, server_cert)
            progress_update(1)

            # pull from server and push our own data to server
            if not options['no_pull']:
                sync_client.initiate_pull(Filter(options['dataset_id']))
            if not options['no_push']:
                sync_client.initiate_push(Filter(options['dataset_id']))
            progress_update(1)

            self.create_superuser_and_provision_device(options['username'], options['dataset_id'])
            progress_update(1)

            sync_client.close_sync_session()
            progress_update(1)
