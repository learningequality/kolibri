from le_utils.constants import content_kinds
from le_utils.constants import format_presets

from kolibri.core.content.hooks import ContentViewerHook
from kolibri.core.content.hooks import VirtualRootUnreadable
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.paths import get_content_storage_file_path
from kolibri.plugins.zim_viewer.zim_format import CorruptZimError
from kolibri.plugins.zim_viewer.zim_format import NotZimError
from kolibri.plugins.zim_viewer.zim_format import ZimReader

HTML_MIMETYPES = ("text/html", "application/xhtml+xml")

_FAMILY_KINDS = {"video": content_kinds.VIDEO, "audio": content_kinds.AUDIO}


def _mime_essence(mimetype):
    return mimetype.split(";")[0].strip().lower()


def _page_kinds(mimetypes):
    kinds = {}
    for mimetype in mimetypes:
        essence = _mime_essence(mimetype)
        family = essence.split("/")[0]
        if essence in HTML_MIMETYPES or (
            family != "image" and ContentViewerHook.renders_mimetype(essence)
        ):
            kinds[mimetype] = _FAMILY_KINDS.get(family, content_kinds.DOCUMENT)
    return kinds


def zim_roots(channel_id):
    return dict(
        File.objects.filter(
            contentnode__channel_id=channel_id,
            contentnode__available=True,
            preset=format_presets.ZIM,
            local_file__available=True,
        ).values_list("contentnode_id", "local_file_id")
    )


def enumerate_zim_subnodes(local_file_id):
    local_file = LocalFile.objects.get(id=local_file_id)
    try:
        path = get_content_storage_file_path(f"{local_file.id}.{local_file.extension}")
        with open(path, "rb") as fh:
            reader = ZimReader(fh)
            kinds = _page_kinds(reader.mime_list())
            for entry_path, title, mimetype in reader.iter_entries(kinds):
                yield {
                    "path": entry_path,
                    "title": title,
                    "kind": kinds[mimetype],
                    "options": {"entry": entry_path},
                }
    except (OSError, NotZimError, CorruptZimError) as e:
        raise VirtualRootUnreadable(f"Unreadable ZIM file {local_file_id}") from e
