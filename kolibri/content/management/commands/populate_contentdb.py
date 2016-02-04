'''
the data structure
     root
    /    \
   c1     c2
        /  |  \
    c2c1 c2c2 c2c3

to run the command: <kolibri manage populate_contentdb>
'''
import uuid

from django.core.management.base import BaseCommand
from kolibri.content import models


class Command(BaseCommand):
    help = """To collect data for fixture, run the commandline <kolibri manage dumpdata content>.
              You may want to run <kolibri manage flush> to clean the database after you have created the fixture."""

    def populate_content_db(self):
        """
        create artifical objects in the main database for testig
        """
        db_name = "default"

        # populate MimeType
        video_L = models.MimeType.objects.using(db_name).create(readable_name='video_lowres', machine_name='Wall-E')
        video_H = models.MimeType.objects.using(db_name).create(readable_name='video_high', machine_name='Doraemon')
        ex_L = models.MimeType.objects.using(db_name).create(readable_name='exercise_lowres', machine_name='Optimus')
        models.MimeType.objects.using(db_name).create(readable_name='audio_lowres', machine_name='Asimo')
        models.MimeType.objects.using(db_name).create(readable_name='audio_normal', machine_name='Roomba')
        models.MimeType.objects.using(db_name).create(readable_name='audio_high', machine_name='Astro')
        models.MimeType.objects.using(db_name).create(readable_name='image_lowres', machine_name='Hal-2000')
        models.MimeType.objects.using(db_name).create(readable_name='image_normal', machine_name='Hal-2000')
        models.MimeType.objects.using(db_name).create(readable_name='image_highres', machine_name='Android')
        models.MimeType.objects.using(db_name).create(readable_name='video_normal', machine_name='Eva')
        models.MimeType.objects.using(db_name).create(readable_name='exercise_normal', machine_name='Terminator')
        models.MimeType.objects.using(db_name).create(readable_name='exercise_highres', machine_name='Ed-209')

        # populate License
        WTFPL = models.License.objects.using(db_name).create(license_name='WTFPL')
        GNU = models.License.objects.using(db_name).create(license_name='GNU')
        CC = models.License.objects.using(db_name).create(license_name='CC')
        models.License.objects.using(db_name).create(license_name='MIT')

        # populate ContentMetadata
        root = models.ContentMetadata.objects.using(db_name).create(
            title='root', parent=None, license=WTFPL, kind='topic',
            description='balbla1', slug='slut_1', total_file_size=21, available=False, content_id=uuid.uuid4())
        c1 = models.ContentMetadata.objects.using(db_name).create(
            title='c1', parent=root, license=WTFPL, kind='video',
            description='balbla2', slug='slut_2', total_file_size=22, available=False, content_id=uuid.uuid4())
        c2 = models.ContentMetadata.objects.using(db_name).create(
            title='c2', parent=root, license=GNU, kind='topic',
            description='balbla3', slug='slut_3', total_file_size=23, available=False, content_id=uuid.uuid4())
        c2c1 = models.ContentMetadata.objects.using(db_name).create(
            title='c2c1', parent=c2, license=CC, kind='exercise',
            description='balbla4', slug='slut_4', total_file_size=23, available=False, content_id=uuid.uuid4())
        models.ContentMetadata.objects.using(db_name).create(
            title='c2c2', parent=c2, license=GNU, kind='topic',
            description='balbla5', slug='slut_5', total_file_size=23, available=False, content_id=uuid.uuid4())
        models.ContentMetadata.objects.using(db_name).create(
            title='c2c3', parent=c2, license=GNU, kind='topic',
            description='balbla5', slug='slut_6', total_file_size=24, available=False, content_id=uuid.uuid4())

        # populate Format
        format_1 = models.Format.objects.using(db_name).create(contentmetadata=c1, mimetype=video_H, available=False, format_size=102, quality="high")
        format_2 = models.Format.objects.using(db_name).create(contentmetadata=c1, mimetype=video_L, available=False, format_size=51, quality="low")
        format_3 = models.Format.objects.using(db_name).create(contentmetadata=c2c1, mimetype=ex_L, available=False, format_size=46, quality="high")

        # populate File
        models.File.objects.using(db_name).create(format=format_1)
        models.File.objects.using(db_name).create(format=format_2)
        models.File.objects.using(db_name).create(format=format_3)
        models.File.objects.using(db_name).create(format=format_3)

        # populate Content Relationship
        models.PrerequisiteContentRelationship.objects.using(db_name).create(relationship_type='prerequisite', contentmetadata_1=root, contentmetadata_2=c1)
        models.RelatedContentRelationship.objects.using(db_name).create(relationship_type='related', contentmetadata_1=c1, contentmetadata_2=c2)

    def handle(self, *args, **options):
        self.populate_content_db()
