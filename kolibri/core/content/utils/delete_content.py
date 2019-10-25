from kolibri.core.content.models import LocalFile

import logging
logger = logging.getLogger(__name__)

def cleanup_unavailable_stored_files():
    deleted_files = LocalFile.objects.delete_unavailable_stored_files()
    freed_bytes = sum((f.file_size for f in deleted_files), 0)
    logger.info(
        "Cleaned up %i unused files, freeing %i bytes." % ( len(deleted_files), freed_bytes )
    )

