from kolibri.core.content.models import LocalFile

def delete_unavailable_stored_files():
    for f in LocalFile.objects.get_unavailable_files():
        f.delete_stored_file()
