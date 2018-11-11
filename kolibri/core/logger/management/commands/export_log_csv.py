import logging
import os
import tempfile

from kolibri.core.logger.csv import ContentSessionLogCSVExportViewSet
from kolibri.core.logger.csv import ContentSummaryLogCSVExportViewSet
from kolibri.core.tasks.management.commands.base import AsyncCommand

logger = logging.getLogger(__name__)


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
        serializer_class = csv_set.get_serializer_class()
        serializer = serializer_class(queryset, many=True)
        # The async update part must be implemented in the next sentence:
        data = serializer.data
        renderer = csv_set.renderer_classes[0]()
        return renderer.render(data)

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
        buffer = self._data(csv_set)
        self._create_file(buffer, options['output_file'])
