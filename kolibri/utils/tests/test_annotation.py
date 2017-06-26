import pytest

from kolibri.content.utils.annotation import update_channel_metadata_cache


@pytest.mark.django_db
def test_annotation():
    update_channel_metadata_cache()
