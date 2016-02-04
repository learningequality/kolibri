'''
to run the command: <kolibri manage populate_channel>
'''
from django.core.management.base import BaseCommand
from kolibri.content import models


class Command(BaseCommand):
    help = """To collect data for fixture, run the commandline <kolibri manage dumpdata content>.'
              You may want to run <kolibri manage flush> to clean the database after you have created the fixture."""

    def populate_channel_db(self):
        '''
        create artifical objects in the main database for testig
        '''
        models.ChannelMetadata.objects.create(
            name='khan', channel_id='6199dde6-95db-4ee4-ab39-2222d5af1e5c', author='eli', description='dummy khan', theme="i'm a json blob", subscribed=True)
        models.ChannelMetadata.objects.create(
            name='ucsd', channel_id='9788ab1e-eb91-4487-a2fb-89f9953e66ac', author='eli', description='dummy ucsd', theme="i'm a json blob", subscribed=True)

    def handle(self, *args, **options):
        self.populate_channel_db()
