from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.test.model_factory import ModelFactory
from kolibri.utils.time_utils import local_now

from .. import models


class ContentSessionLogFactory(ModelFactory):
    model = models.ContentSessionLog
    _start_timestamp = local_now()

    @classmethod
    def field_defaults(cls):
        return {
            "user": FacilityUserFactory.create,
            "start_timestamp": cls._start_timestamp,
        }


class ContentSummaryLogFactory(ModelFactory):
    model = models.ContentSummaryLog
    _start_timestamp = local_now()

    @classmethod
    def field_defaults(cls):
        return {
            "user": FacilityUserFactory.create,
            "start_timestamp": cls._start_timestamp,
        }


class UserSessionLogFactory(ModelFactory):
    model = models.UserSessionLog

    @classmethod
    def field_defaults(cls):
        return {"user": FacilityUserFactory.create}


class GenerateCSVLogRequestFactory(ModelFactory):
    model = models.GenerateCSVLogRequest
    _selected_start_date = local_now()
    _selected_end_date = local_now()
    _date_requested = local_now()

    @classmethod
    def field_defaults(cls):
        return {
            "selected_start_date": cls._selected_start_date,
            "selected_end_date": cls._selected_end_date,
            "date_requested": cls._date_requested,
        }
