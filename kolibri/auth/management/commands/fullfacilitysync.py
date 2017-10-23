from django.utils.six.moves import input
from kolibri.auth.models import FacilityUser
from kolibri.core.device.utils import device_provisioned
from kolibri.core.device.models import DevicePermissions, DeviceSettings
from kolibri.tasks.management.commands.base import AsyncCommand
from morango.controller import MorangoProfileController
from morango.certificates import Certificate, Filter

class Command(AsyncCommand):

    def add_arguments(self, parser):
        parser.add_argument('--dataset-id', type=str)
        parser.add_argument('--no-push', type=bool, default=False)
        parser.add_argument('--no-pull', type=bool, default=False)
        parser.add_argument('--host', type=str)
        parser.add_argument('--username', type=str)
        parser.add_argument('--password', type=str)

    def handle_async(self, *args, **options):
        controller = MorangoProfileController('facilitydata')
        with self.start_progress(total=5) as progress_update:
            network_connection = controller.create_network_connection(options['host'])
            progress_update(1)
            # get list of facilities and if more than 1, display all choices to user
            facility_resp = network_connection._request('api/facility/')
            facility_resp.raise_for_status()
            facilities = facility_resp.json()
            if len(facilities) > 1 and not options['dataset_id']:
                message = 'Please choose a facility to sync with:\n'
                for idx, f in enumerate(facilities):
                    message += "{}. {}\n".format(idx + 1, f['name'])
                idx = input(message)
                options['dataset_id'] = facilities[int(idx-1)]['dataset']
            # get servers certificates which server has a private key for
            server_certs = network_connection.get_remote_certificates(options['dataset_id'], scope_def_id='full-facility')
            if not server_certs:
                print('Server does not have any certificates for dataset_id: {}'.format(options['dataset_id']))
                return
            server_cert = server_certs[0]
            progress_update(1)
            # check for the certs we own for the specific facility
            owned_certs = Certificate.objects.filter(id=options['dataset_id']) \
                                             .get_descendants(include_self=True) \
                                             .filter(scope_definition_id="full-facility") \
                                             .exclude(_private_key=None)
            # if we don't own any certs, do a csr request
            if not owned_certs:
                # prompt user for creds if not already specified
                if not options['username'] or not options['password']:
                    options['username'] = input('Please enter username: ')
                    options['password'] = input('Please enter password: ')
                client_cert = network_connection.certificate_signing_request(server_cert, 'full-facility', {'dataset_id': options['dataset_id']},
                                                                             userargs=options['username'], password=options['password'])
            else:
                client_cert = owned_certs[0]
            sync_client = network_connection.create_sync_session(client_cert, server_cert)
            progress_update(1)
            # pull from server and push our own data to server
            if not options['no_pull']:
                sync_client.initiate_pull(Filter(options['dataset_id']))
            if not options['no_push']:
                sync_client.initiate_push(Filter(options['dataset_id']))
            progress_update(1)
            # make the user with the given credentials, a superuser for this device
            user = FacilityUser.objects.get(username=options['username'], dataset_id=options['dataset_id'])
            # create permissions for the authorized user
            DevicePermissions.objects.update_or_create(user=user, defaults={'is_superuser': True, 'can_manage_content': True})
            # if device has not been provisioned, set it up
            if not device_provisioned():
                device_settings, created = DeviceSettings.objects.get_or_create()
                device_settings.is_provisioned = True
                device_settings.save()
            sync_client.close_sync_session()
            progress_update(1)
