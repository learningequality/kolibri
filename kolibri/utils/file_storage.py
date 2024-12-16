# https://django-storages.readthedocs.io/en/latest/backends/gcloud.html#google-cloud-storage
from storages.backends.gcloud import GoogleCloudStorage  # noqa


class KolibriFileStorage(GoogleCloudStorage):
    # TODO Should this be like the device ID or something?
    default_acl = "publicRead"
    bucket_name = "kolibri"


class KolibriFileStorageDebug(KolibriFileStorage):
    """
    See: https://github.com/fullstorydev/emulators?tab=readme-ov-file#google-cloud-storage-emulator
    Once installed, run `gscemulator -port 7070`
    This field being set will allow our GoogleCloudStorage library to interface with the emulator
    """

    custom_endpoint = "http://localhost:7070"
    bucket_name = "kolibri_debug_bucket"
