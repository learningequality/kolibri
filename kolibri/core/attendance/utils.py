from rest_framework.serializers import ValidationError


def validate_users_share_dataset(user_dataset_ids, dataset_id, field):
    """
    Reject users that belong to a dataset other than the session's.

    ``AttendanceRecord.infer_dataset`` enforces this, but as an ``IntegrityError``,
    which reaches the client as a 500. The write endpoints check it first so the
    response is a 400 naming the users instead.

    :param user_dataset_ids: pairs of user id and that user's dataset id
    :param dataset_id: the dataset the records belong to
    :param field: the serializer field to report the error against
    """
    foreign = sorted(
        str(user_id)
        for user_id, user_dataset_id in user_dataset_ids
        if user_dataset_id != dataset_id
    )
    if foreign:
        raise ValidationError(
            {field: f"User IDs from another dataset: {', '.join(foreign)}"}
        )
