from django.core.management.base import BaseCommand

from ...utils.filesystem import enumerate_mounted_disk_partitions


class Command(BaseCommand):
    """
    List all the mounted drives that are connected to this computer.
    """

    def handle(self, *args, **options):

        drives = enumerate_mounted_disk_partitions()

        for path, drive in drives.items():

            self.stdout.write(path + "\n")
            for field, value in drive._asdict().items():
                self.stdout.write("\t{}: {}\n".format(field, value))
            self.stdout.write("\n")
