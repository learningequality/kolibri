from kolibri.core.content.models import LocalFile

import logging
logger = logging.getLogger(__name__)

def cleanup_unavailable_stored_files():
    count_deleted = 0
    freed_bytes = 0
    for file, deleted in LocalFile.objects.delete_unavailable_stored_files():
        if deleted:
            count_deleted += 1
            freed_bytes += file.file_size

    logger.info(
        "Cleaned up %i unused files, freeing %i bytes." % ( count_deleted, freed_bytes )
    )

    return count_deleted, freed_bytes

