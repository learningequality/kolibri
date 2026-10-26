import logging
from typing import ClassVar

from django.http import JsonResponse
from django.views import View

from kolibri.core.content.utils.paths import get_content_storage_file_path
from kolibri.plugins.zim_viewer.zim_format import CorruptZimError
from kolibri.plugins.zim_viewer.zim_format import NotZimError
from kolibri.plugins.zim_viewer.zim_format import ZimReader

logger = logging.getLogger(__name__)

# Content storage filenames are the file's md5.
_IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"


def _resolve_one(reader, zim_path):
    entry = reader.find_entry(zim_path)
    if entry is None:
        return None
    entry = reader.follow_redirect(entry)
    descriptor = {
        "clusterNumber": entry.cluster_number,
        "blobNumber": entry.blob_number,
        "mimetype": entry.mimetype,
        "namespace": entry.namespace,
        "path": f"{entry.namespace}/{entry.url}",
    }
    blob_range = reader.blob_range(entry)
    if blob_range is not None:
        descriptor["blobOffset"], descriptor["blobSize"] = blob_range
    return descriptor


def resolve_paths(reader, paths):
    results = {}
    for zim_path in dict.fromkeys(paths):
        descriptor = _resolve_one(reader, zim_path)
        if descriptor is not None:
            results[zim_path] = descriptor
    return results


class ZimResolveBatchView(View):
    http_method_names: ClassVar[list] = ["get", "head"]

    def get(self, request, filename):
        # Django's UpdateCacheMiddleware would store this response server-side for its
        # whole max-age; it skips requests carrying this flag.
        request._cache_update_cache = False
        # REMOTE_CONTENT deployments aren't supported yet: ZIMs are read from local storage.
        path = get_content_storage_file_path(filename)
        paths = request.GET.getlist("path")
        try:
            # Unbuffered measured ~4x faster on a 200k-entry ZIM: every search step seeks.
            with open(path, "rb", buffering=0) as fh:
                results = resolve_paths(ZimReader(fh), paths)
            response = JsonResponse({"results": results})
            response["Cache-Control"] = _IMMUTABLE_CACHE_CONTROL
            return response
        except FileNotFoundError:
            return JsonResponse({"detail": "File not found"}, status=404)
        except NotZimError:
            return JsonResponse({"detail": "Not a ZIM file"}, status=400)
        except CorruptZimError:
            logger.warning("Corrupt ZIM file %s", filename, exc_info=True)
            return JsonResponse({"detail": "Corrupt ZIM file"}, status=400)
