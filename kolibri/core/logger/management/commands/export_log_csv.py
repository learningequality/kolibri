import logging
import os
import tempfile

from rest_framework import serializers

from kolibri.core.logger.csv import ContentSessionLogCSVExportViewSet
from kolibri.core.logger.csv import ContentSummaryLogCSVExportViewSet
from kolibri.core.tasks.management.commands.base import AsyncCommand

logger = logging.getLogger(__name__)


class AsyncListSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        """
        List of object instances -> List of dicts of primitive datatypes.
        """
        for item in data:
            yield self.child.to_representation(item)

    @property
    def data(self):
        # We deliberately return the super of ListSerializer to avoid
        # instantiating a ReturnList, which would force evaluating the generator
        return super(serializers.ListSerializer, self).data


class Command(AsyncCommand):

    def add_arguments(self, parser):
        parser.add_argument('-O', '--output-file',
                            action='store', dest='output_file', default=None, type=str,
                            help='The generated file will be saved with this name'
                            )
        parser.add_argument('-l', '--log-type',
                            action='store', dest='log_type', default="session", choices=['summary', 'session'],
                            help='Log type to be exported. Valid values are "session" and "summary".'
                            )

    def _data(self, csv_set):
        queryset = csv_set.get_queryset()
        self.total_rows = queryset.count()
        serializer_class = csv_set.get_serializer_class()
        serializer_class.Meta.list_serializer_class = AsyncListSerializer
        serializer = serializer_class(queryset, many=True)

        finished = False
        while not finished:
            finished = self._get_serialized_data(serializer)
            if self.is_cancelled():
                self.cancel()
                break
        renderer = csv_set.renderer_classes[0]()
        return renderer.render(self.data)

    def _get_serialized_data(self, serializer):
        self.data = []
        with self.start_progress(total=self.total_rows) as progress_update:
            for item in serializer.data:
                progress_update(1)
                self.data.append(item)

        return True

    def _create_file(self, buffer, filename=None):
        if filename:
            self.filepath = os.path.join(os.getcwd(), filename)
        else:
            _, self.filepath = tempfile.mkstemp(suffix='.csv')
        try:
            with open(self.filepath, "w") as f:
                f.write(buffer)
                logger.info("Creating csv file {filename}".format(filename=self.filepath))
        except IOError:
            logger.error("Error trying to write csv file")

    def handle_async(self, *args, **options):
        export_classes = {
            'summary': ContentSessionLogCSVExportViewSet,
            'session': ContentSummaryLogCSVExportViewSet,
        }
        csv_set = export_classes[options['log_type']]()
        # Here is where 99% of the time is spent:
        buffer = self._data(csv_set)
        # Considering insignificant (in relation to the time needed to serialize the table)
        # the time spent in saving the file:
        self._create_file(buffer, options['output_file'])
