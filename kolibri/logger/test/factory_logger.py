import factory
import uuid
from kolibri.auth.test.test_api import FacilityUserFactory

from .. import models


class ContentInteractionLogFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.ContentInteractionLog

    user = factory.SubFactory(FacilityUserFactory)
    content_id = uuid.uuid4().hex
    channel_id = uuid.uuid4().hex
    item_session = uuid.uuid4().hex


class ContentSummaryLogFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.ContentSummaryLog

    user = factory.SubFactory(FacilityUserFactory)
    content_id = uuid.uuid4().hex
    channel_id = uuid.uuid4().hex


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
