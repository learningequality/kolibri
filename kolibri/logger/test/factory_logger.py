import datetime
import factory
import uuid
from kolibri.auth.test.test_api import FacilityUserFactory

from .. import models


class ContentSessionLogFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.ContentSessionLog

    user = factory.SubFactory(FacilityUserFactory)
    content_id = uuid.uuid4().hex
    channel_id = uuid.uuid4().hex
    start_timestamp = datetime.datetime.now()


class ContentSummaryLogFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.ContentSummaryLog

    user = factory.SubFactory(FacilityUserFactory)
    content_id = uuid.uuid4().hex
    channel_id = uuid.uuid4().hex
    start_timestamp = datetime.datetime.now()


class ContentRatingLogFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.ContentRatingLog

    user = factory.SubFactory(FacilityUserFactory)
    content_id = uuid.uuid4().hex
    channel_id = uuid.uuid4().hex


class UserSessionLogFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.UserSessionLog

    user = factory.SubFactory(FacilityUserFactory)
