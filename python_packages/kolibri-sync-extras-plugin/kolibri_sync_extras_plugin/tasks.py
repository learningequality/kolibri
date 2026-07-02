import json


def get_job_key(context):
    """
    A sync could have multiple transfer sessions, so we'll key by the transfer session ID
    """
    return "{}_{}_job_id".format(context.transfer_session.id, context.stage)


def get_job_id(context):
    """
    Returns a job id saved on the sync session for persistence
    """
    extra_fields = json.loads(context.sync_session.extra_fields)
    return extra_fields.get(get_job_key(context))


def set_job_id(context, job_id):
    """
    Saves a job id on the sync session for persistence
    """
    context.sync_session.refresh_from_db(fields=["extra_fields"])
    extra_fields = json.loads(context.sync_session.extra_fields)
    job_key = get_job_key(context)
    extra_fields[job_key] = job_id
    context.sync_session.extra_fields = json.dumps(extra_fields)
    context.sync_session.save()
