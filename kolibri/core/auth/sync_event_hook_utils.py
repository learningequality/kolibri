import json
import logging

from django.utils.functional import wraps
from morango.sync.context import LocalSessionContext

from kolibri.core.auth.constants.morango_sync import ScopeDefinitions
from kolibri.core.auth.hooks import FacilityDataSyncHook


logger = logging.getLogger(__name__)


def _get_our_cert(context):
    ss = context.sync_session
    return ss.server_certificate if ss.is_server else ss.client_certificate


def _get_their_cert(context):
    ss = context.sync_session
    return ss.client_certificate if ss.is_server else ss.server_certificate


def this_side_using_single_user_cert(context):
    return _get_our_cert(context).scope_definition_id == ScopeDefinitions.SINGLE_USER


def other_side_using_single_user_cert(context):
    return _get_their_cert(context).scope_definition_id == ScopeDefinitions.SINGLE_USER


def get_user_id_for_single_user_sync(context):
    if other_side_using_single_user_cert(context):
        cert = _get_their_cert(context)
    elif this_side_using_single_user_cert(context):
        cert = _get_our_cert(context)
    else:
        return None
    return json.loads(cert.scope_params)["user_id"]


def get_other_side_kolibri_version(context):
    """
    :type context: morango.sync.context.LocalSessionContext
    :return: A str or None
    """
    # get the instance info for the other instance
    instance_info = context.sync_session.server_instance_data
    if context.is_server:
        instance_info = context.sync_session.client_instance_data

    # get the kolibri version, which is defined in
    # kolibri.core.auth.constants.morango_sync:CUSTOM_INSTANCE_INFO
    return instance_info.get("kolibri")


def _extract_kwargs_from_context(context):
    return {
        "dataset_id": _get_our_cert(context).get_root().id,
        "local_is_single_user": this_side_using_single_user_cert(context),
        "remote_is_single_user": other_side_using_single_user_cert(context),
        "single_user_id": get_user_id_for_single_user_sync(context),
        "context": context,
    }


def _local_event_handler(func):
    @wraps(func)
    def wrapper(context):
        if isinstance(context, LocalSessionContext):
            kwargs = _extract_kwargs_from_context(context)
            return func(**kwargs)

    return wrapper


@_local_event_handler
def _pre_transfer_handler(**kwargs):
    for hook in FacilityDataSyncHook.registered_hooks:
        # we catch all errors because as a rule of thumb, we don't want hooks to fail
        try:
            hook.pre_transfer(**kwargs)
        except Exception as e:
            logger.error(
                "{}.pre_transfer hook failed".format(hook.__class__.__name__),
                exc_info=e,
            )


@_local_event_handler
def _post_transfer_handler(**kwargs):
    for hook in FacilityDataSyncHook.registered_hooks:
        # we catch all errors because as a rule of thumb, we don't want hooks to fail
        try:
            hook.post_transfer(**kwargs)
        except Exception as e:
            logger.error(
                "{}.post_transfer hook failed".format(hook.__class__.__name__),
                exc_info=e,
            )


def register_sync_event_handlers(session_controller):
    session_controller.signals.initializing.completed.connect(_pre_transfer_handler)
    session_controller.signals.cleanup.completed.connect(_post_transfer_handler)
