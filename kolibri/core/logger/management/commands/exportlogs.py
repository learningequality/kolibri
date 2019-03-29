import logging
import os
import sys

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
        parser.add_argument('-w', '--overwrite',
                            action='store', dest='overwrite', default=False, type=bool,
                            help='Allows overwritten of the exported file in case it exists'
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

    def _create_file(self, buffer):
        try:
            with open(self.filepath, 'wb') as f:
                f.write(buffer)
                logger.info('Creating csv file {filename}'.format(filename=self.filepath))
        except IOError as e:
            logger.error('Error trying to write csv file: {}'.format(e.strerror))
            sys.exit(1)

    def handle_async(self, *args, **options):
        classes_info = {
            'summary': (ContentSessionLogCSVExportViewSet, 'content_summary_logs.csv'),
            'session': (ContentSummaryLogCSVExportViewSet, 'content_session_logs.csv')
        }
        log_type = options['log_type']
        if log_type not in ('summary', 'session'):
            logger.error('Impossible to create a csv export file for {}'.format(log_type))
            sys.exit(1)

        if options['output_file'] is None:
            filename = classes_info[log_type][1]
        else:
            filename = options['output_file']

        self.filepath = os.path.join(os.getcwd(), filename)

        if not options['overwrite']:
            if os.path.exists(self.filepath):
                logger.error('{} already exists in your directory'.format(filename))
                sys.exit(1)
        csv_set = classes_info[log_type][0]()
        # Here is where 99% of the time is spent:
        buffer = self._data(csv_set)
        # Considering insignificant (in relation to the time needed to serialize the table)
        # the time spent in saving the file:
        self._create_file(buffer)
