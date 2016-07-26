import factory
import uuid
from kolibri.auth import models as auth

from .. import models

DUMMY_PASSWORD = "password"


class FacilityFactory(factory.DjangoModelFactory):

    class Meta:
        model = auth.Facility

    name = factory.Sequence(lambda n: "Rock N' Roll High School #%d" % n)


class FacilityUserFactory(factory.DjangoModelFactory):

    class Meta:
        model = auth.FacilityUser

    facility = factory.SubFactory(FacilityFactory)
    username = factory.Sequence(lambda n: 'user%d' % n)
    password = factory.PostGenerationMethodCall('set_password', DUMMY_PASSWORD)


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
