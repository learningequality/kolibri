from uuid import UUID


def is_valid_uuid(uuid_to_test, version=4):
    """
    Check if uuid_to_test is a valid UUID.

    :param uuid_to_test: str
    :param version: int {1, 2, 3, 4}
    :return: True if uuid_to_test is from a valid UUID
    """
    try:
        uuid_obj = UUID(uuid_to_test, version=version)
    except ValueError:
        return False

    return str(uuid_obj) == uuid_to_test
