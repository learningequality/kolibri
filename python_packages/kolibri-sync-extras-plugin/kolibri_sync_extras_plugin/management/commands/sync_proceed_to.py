import logging

from django.core.management.base import BaseCommand
from morango.api.viewsets import session_controller
from morango.constants import transfer_statuses
from morango.models.core import TransferSession

from kolibri_sync_extras_plugin.sync.context import BackgroundSessionContext


logger = logging.getLogger(__name__)


MAX_RETRIES = 5


class SyncProceedToError(Exception):
    pass


class Command(BaseCommand):
    help = "Proceeds a push sync through final stages"

    def add_arguments(self, parser):
        parser.add_argument("--id", type=str, action="store")
        parser.add_argument("--target-stage", type=str, action="store")
        parser.add_argument(
            "--capabilities", type=lambda caps: caps.split(","), action="store"
        )

    def handle(self, *args, **options):

        transfer_session = TransferSession.objects.defer(
            "client_fsic", "server_fsic"
        ).get(pk=options.pop("id"))
        target_stage = options.pop("target_stage")
        capabilities = options.pop("capabilities")

        context = BackgroundSessionContext(
            transfer_session=transfer_session, is_push=True, capabilities=capabilities
        )

        logger.info("Proceeding {} to {}".format(transfer_session.pk, target_stage))
        status = transfer_statuses.PENDING
        tries = 0

        # retry in case of transaction rollback errors from transaction isolation
        while status not in transfer_statuses.FINISHED_STATES and tries < MAX_RETRIES:
            if tries > 0:
                logger.info(
                    "Retrying {} to {}".format(transfer_session.pk, target_stage)
                )
            status = session_controller.proceed_to(
                target_stage=target_stage,
                context=context,
            )
            tries += 1

        logger.info(
            "Proceeded {} to {} with status '{}'".format(
                transfer_session.pk, target_stage, status
            )
        )

        if status != transfer_statuses.COMPLETED:
            if status == transfer_statuses.ERRORED:
                # capture context.error in the stack trace
                raise SyncProceedToError(
                    "Failed to finalize {}".format(transfer_session.pk)
                ) from context.error
            elif tries >= MAX_RETRIES:
                # the only finished states are completed or errored, so in this case we must have
                # exceeded our retry attempts
                raise SyncProceedToError(
                    "Exceeded retry attempts to finalize {}".format(transfer_session.pk)
                )
            else:
                # this should really never happen
                raise RuntimeError(
                    "Unexpected failure finalizing {}".format(transfer_session.pk)
                )
