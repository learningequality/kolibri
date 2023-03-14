import factory

from .. import models
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.utils.time_utils import local_now


class ContentSessionLogFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.ContentSessionLog

    user = factory.SubFactory(FacilityUserFactory)
    start_timestamp = local_now()


class ContentSummaryLogFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.ContentSummaryLog

    user = factory.SubFactory(FacilityUserFactory)
    start_timestamp = local_now()


class UserSessionLogFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.UserSessionLog

    user = factory.SubFactory(FacilityUserFactory)


class GenerateCSVLogRequestFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.GenerateCSVLogRequest

    selected_start_date = local_now()
    selected_end_date = local_now()
    date_requested = local_now()
