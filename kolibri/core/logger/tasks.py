from django.core.management import call_command

from kolibri.core.content.permissions import CanExportLogs
from kolibri.core.logger.task_validators import validate_startexportlogcsv
from kolibri.core.tasks.decorators import register_task


@register_task(
    validator=validate_startexportlogcsv,
    track_progress=True,
    permission_classes=[CanExportLogs],
)
def startexportlogcsv(**kwargs):
    """
    Dumps in csv format the required logs.
    By default it will be dump contentsummarylog.

    :param: logtype: Kind of log to dump, summary or session.
    :param: facility.
    """
    call_command(
        "exportlogs",
        log_type=kwargs["log_type"],
        output_file=kwargs["filepath"],
        facility=kwargs["facility"].id,
        overwrite="true",
    )
