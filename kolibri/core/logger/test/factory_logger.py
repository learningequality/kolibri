import datetime

import factory

from .. import models
from kolibri.core.auth.test.test_api import FacilityUserFactory


class ContentSessionLogFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.ContentSessionLog

    user = factory.SubFactory(FacilityUserFactory)
    start_timestamp = datetime.datetime.now()


class ContentSummaryLogFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.ContentSummaryLog

    user = factory.SubFactory(FacilityUserFactory)
    start_timestamp = datetime.datetime.now()


class UserSessionLogFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.UserSessionLog

    user = factory.SubFactory(FacilityUserFactory)
