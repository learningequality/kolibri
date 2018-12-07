import uuid


def is_valid_uuid(uuid_to_test, version=None):
    """
    Check if uuid_to_test is a valid UUID.

    :param uuid_to_test: str
    :param version: int {1, 2, 3, 4} or None
    :return: True if uuid_to_test is from a valid UUID
    """
    try:
        if version:
            uuid_obj = uuid.UUID(uuid_to_test, version=version)
        else:
            uuid_obj = uuid.UUID(uuid_to_test)
    except (ValueError, AttributeError, TypeError):
        return False

    return uuid_obj.hex == uuid_to_test
