import uuid

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase

from kolibri.core.content.models import ChannelMetadata as RealChannelMetadata
from kolibri.core.content.models import ContentNode as RealContentNode


# Modified from https://www.caktusgroup.com/blog/2016/02/02/writing-unit-tests-django-migrations/


class TestMigrations(TestCase):

    migrate_from = None
    migrate_to = None
    app = 'content'

    def setUp(self):
        assert self.migrate_from and self.migrate_to, \
            "TestCase '{}' must define migrate_from and migrate_to properties".format(type(self).__name__)

        migrate_from = [(self.app, self.migrate_from)]
        migrate_to = [(self.app, self.migrate_to)]
        executor = MigrationExecutor(connection)
        old_apps = executor.loader.project_state(migrate_from).apps

        # Reverse to the original migration
        executor.migrate(migrate_from)

        self.setUpBeforeMigration(old_apps)

        # Run the migration to test
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()  # reload.
        executor.migrate(migrate_to)

        self.apps = executor.loader.project_state(migrate_to).apps

    def setUpBeforeMigration(self, apps):
        pass


class MultipleCollectionTestCase(TestMigrations):

    migrate_from = '0010_merge_20180504_1540'
    migrate_to = '0011_auto_20180907_1017'

    def setUp(self):
        self.file_size = 10
        super(MultipleCollectionTestCase, self).setUp()

    def setUpBeforeMigration(self, apps):
        ChannelMetadata = apps.get_model('content', 'ChannelMetadata')
        ContentNode = apps.get_model('content', 'ContentNode')
        LocalFile = apps.get_model('content', 'LocalFile')
        File = apps.get_model('content', 'File')
        Language = apps.get_model('content', 'Language')

        channel_id = uuid.uuid4().hex
        Language.objects.create(id='es', lang_code='es')
        root = ContentNode.objects.create(id=uuid.uuid4(),
                                          title='test',
                                          content_id=uuid.uuid4(),
                                          channel_id=channel_id,
                                          lft=1,
                                          rght=12,
                                          tree_id=1,
                                          level=1,
                                          available=True,
                                          lang_id='es')
        l1 = LocalFile.objects.create(id=uuid.uuid4().hex, available=True, file_size=self.file_size)
        File.objects.create(id=uuid.uuid4().hex, available=True, contentnode=root, local_file=l1)
        # unavailable objects which should not be included in calculations
        child = ContentNode.objects.create(id=uuid.uuid4(),
                                           title='test',
                                           content_id=uuid.uuid4(),
                                           channel_id=channel_id,
                                           lft=1,
                                           rght=12,
                                           tree_id=1,
                                           level=2,
                                           available=False,
                                           lang_id='en',
                                           parent=root)
        l2 = LocalFile.objects.create(id=uuid.uuid4().hex, available=False, file_size=self.file_size)
        File.objects.create(id=uuid.uuid4().hex, available=False, contentnode=child, local_file=l2)
        ChannelMetadata.objects.create(
            id=channel_id,
            name='test',
            root=root
        )

    def test_calculated_fields(self):
        channel = RealChannelMetadata.objects.get()
        self.assertEqual(channel.published_size, self.file_size)
        self.assertEqual(channel.total_resource_count, RealContentNode.objects.filter(available=True).count())
        self.assertListEqual(list(channel.included_languages.values_list('id', flat=True)), ['es'])
