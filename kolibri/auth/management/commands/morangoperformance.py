"""
To use this management command specify the KOLIBRI_HOME variable.
"""
import glob
import json
import os
import shutil
import tempfile
import time
import uuid

from contextdecorator import ContextDecorator
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone
from kolibri.auth.models import Classroom, Facility, FacilityDataset, FacilityUser, LearnerGroup, Membership, Role
from kolibri.core.device.utils import device_provisioned
from kolibri.logger.models import AttemptLog, ContentSessionLog, ContentSummaryLog, MasteryLog, UserSessionLog
from morango.certificates import Filter
from morango.controller import MorangoProfileController
from morango.models import Buffer, DatabaseMaxCounter, InstanceIDModel, Store, SyncSession, TransferSession
from morango.utils.sync_utils import _dequeue_into_store, _queue_into_buffer


class Timer(ContextDecorator):

    def __init__(self, message=""):
        self.message = message

    def __enter__(self):
        self.ts = time.time()
        return self

    def __exit__(self, *args):
        self.te = time.time()
        print ("Total time for {}: {} seconds".format(self.message, str(self.te-self.ts)))


class Command(BaseCommand):

    def count_all_models(self):
        return FacilityDataset.objects.count() + \
            Facility.objects.count() + \
            Classroom.objects.count() + \
            LearnerGroup.objects.count() + \
            FacilityUser.objects.count() + \
            Membership.objects.count() + \
            Role.objects.count() + \
            AttemptLog.objects.all().count() + \
            ContentSessionLog.objects.all().count() + \
            ContentSummaryLog.objects.all().count() + \
            UserSessionLog.objects.all().count() + \
            MasteryLog.objects.all().count()

    def delete_all_models(self):
        FacilityDataset.objects.all().delete()
        Facility.objects.all().delete()
        Classroom.objects.all().delete()
        LearnerGroup.objects.all().delete()
        FacilityUser.objects.all().delete()
        Membership.objects.all().delete()
        Role.objects.all().delete()
        AttemptLog.objects.all().delete()
        ContentSessionLog.objects.all().delete()
        ContentSummaryLog.objects.all().delete()
        UserSessionLog.objects.all().delete()
        MasteryLog.objects.all().delete()

    def add_arguments(self, parser):
        parser.add_argument('--num-of-iterations', type=int, default=1)

    def handle(self, *args, **options):
        # seed a database to make it fresh
        if not device_provisioned():
            call_command('migrate')
            call_command('importchannel', 'network', 'e6505498c5eb3b82b2c41610cfd387ab')
            call_command('importcontent', 'network', 'e6505498c5eb3b82b2c41610cfd387ab')
            call_command('generateuserdata', no_onboarding=True)

        # store original database state to restore later
        temp_dir = tempfile.mkdtemp()
        for f in glob.glob(os.path.join(os.environ['KOLIBRI_HOME'], "db.sqlite3*")):
            shutil.copy(f, temp_dir)

        # set up data structures needed for morango operations
        InstanceIDModel.get_or_create_current_instance()
        mc = MorangoProfileController("facilitydata")
        ss = SyncSession.objects.create(id=uuid.uuid4().hex, last_activity_timestamp=timezone.now(), profile='facilitydata')
        d_id = FacilityDataset.objects.first().id

        # run morango operations based on number of iterations parameter
        for i in range(options['num_of_iterations']):

            # serialization of syncable models into morango store
            num_of_records = self.count_all_models()
            with Timer("serializing {} model records into store".format(num_of_records)) as timer:
                mc.serialize_into_store()

            # data structures needed for queuing and dequeuing
            fmcs = DatabaseMaxCounter.calculate_filter_max_counters(Filter(d_id))
            ts = TransferSession.objects.create(id=uuid.uuid4().hex,
                                                sync_session=ss,
                                                push=True,
                                                filter=d_id,
                                                client_fsic=json.dumps(fmcs),
                                                last_activity_timestamp=timezone.now())

            # Queuing morango store records into morango buffer for sending across the network
            with Timer("queuing {} store records into buffer".format(num_of_records)) as timer:
                _queue_into_buffer(ts)

            # Clear store and dequeue morango buffer into morango store
            Store.objects.all().delete()
            with Timer("dequeuing {} buffer records into store".format(Buffer.objects.count())) as timer:
                _dequeue_into_store(ts)

            # delete syncable models and update all store records
            self.delete_all_models()
            Store.objects.all().update(dirty_bit=True)

            # deserialize morango store into app models
            num_of_store_records = Store.objects.all().count()
            assert num_of_records == num_of_store_records, "Number of store records does not equal number of model records"
            with Timer("deserializing {} model records from store".format(num_of_store_records)) as timer:  # noqa F841
                mc.deserialize_from_store()

            # reset database to clean state
            for f in glob.glob(os.path.join(temp_dir, "db.sqlite3*")):
                shutil.copy(f, os.environ['KOLIBRI_HOME'])
