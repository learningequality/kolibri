from datetime import timedelta

import pytz
from django.conf import settings

from kolibri.core.analytics.models import DonationNotificationStatus
from kolibri.core.analytics.models import LocalNotification
from kolibri.core.analytics.models import PingbackStatus
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.logger.models import ContentSessionLog
from kolibri.utils import conf
from kolibri.utils.constants import installation_types
from kolibri.utils.server import installation_type
from kolibri.utils.time_utils import local_now

IMPACT_STORIES_KEY = "impact-stories"
DONATION_KEY = "donation"

ROLLING_WINDOW_DAYS = 90
ACTIVITY_THRESHOLD = 100
PINGBACK_RECENCY = timedelta(hours=24)
DONATION_TIMEZONES = (
    frozenset(pytz.country_timezones["us"])
    | {tz for tz in pytz.all_timezones if tz.startswith("US/")}
    | {"UTC", "Etc/UTC"}
)


def _recent_sessions_reach(count, now):
    cutoff = now - timedelta(days=ROLLING_WINDOW_DAYS)
    # Bound the scan to count rows — we only need to know whether the count
    # crosses the threshold, not its exact value. On facilities with millions
    # of session logs this avoids a full scan of an un-indexed column.
    recent = ContentSessionLog.objects.filter(start_timestamp__gte=cutoff)
    return recent[:count].count() == count


def create_impact_stories_notification_if_needed():
    """
    Evaluate the impact-stories trigger conditions and create a LocalNotification
    row if eligible. Returns True if a row was created, False otherwise.
    """
    if LocalNotification.objects.filter(key=IMPACT_STORIES_KEY).exists():
        return False
    if FacilityDataset.objects.filter(registered=True).exists():
        return False
    if not _recent_sessions_reach(ACTIVITY_THRESHOLD, local_now()):
        return False
    LocalNotification.objects.create(key=IMPACT_STORIES_KEY)
    return True


def _pingback_is_recent(now):
    status = PingbackStatus.objects.first()
    return status is not None and now - status.last_succeeded <= PINGBACK_RECENCY


def create_donation_notification_if_needed():
    """
    Returns True if a donation LocalNotification row was created, False otherwise.
    """
    if not conf.OPTIONS["Deployment"]["DONATION_NOTIFICATIONS_ENABLED"]:
        return False
    if settings.TIME_ZONE not in DONATION_TIMEZONES:
        return False
    if installation_type() != installation_types.DOCKER:
        return False
    if LocalNotification.objects.filter(key=DONATION_KEY).exists():
        return False
    if FacilityDataset.objects.filter(registered=True).exists():
        return False
    now = local_now()
    if not _pingback_is_recent(now):
        return False
    last_dismissed = DonationNotificationStatus.last_dismissed_at()
    if last_dismissed and now - last_dismissed < timedelta(days=ROLLING_WINDOW_DAYS):
        return False
    if not _recent_sessions_reach(ACTIVITY_THRESHOLD + 1, now):
        return False
    DonationNotificationStatus.objects.get_or_create(pk=1)
    LocalNotification.objects.create(key=DONATION_KEY)
    return True
