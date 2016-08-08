import fnmatch
import logging as logger
import os
import uuid

logging = logger.getLogger(__name__)

def _is_valid_hex_uuid(uuid_to_test):
    try:
        uuid_obj = uuid.UUID(uuid_to_test)
    except ValueError:
        return False
    return uuid_to_test == uuid_obj.hex

def get_channel_id_list_from_scanning_content_database_dir(content_database_dir, return_full_dir=False):
    """
    Returns a list of channel IDs for the channel databases that exist in a content database directory.
    """
    db_list = fnmatch.filter(os.listdir(content_database_dir), '*.sqlite3')
    db_names = [db.split('.sqlite3', 1)[0] for db in db_list]
    valid_db_names = [name for name in db_names if _is_valid_hex_uuid(name)]
    invalid_db_names = set(db_names) - set(valid_db_names)

    if invalid_db_names:
        logging.warning("Ignoring databases in content database directory '{directory}' with invalid names: {names}"
                        .format(directory=content_database_dir, names=invalid_db_names))

    if not return_full_dir:
        return valid_db_names
    else:
        full_dir_template = os.path.join(content_database_dir, "{}.sqlite3")
        return [full_dir_template.format(f) for f in valid_db_names]
