from datetime import timedelta

from kolibri.core.analytics.models import LocalNotification
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.logger.models import ContentSessionLog
from kolibri.utils.time_utils import local_now

IMPACT_STORIES_KEY = "impact-stories"

ROLLING_WINDOW_DAYS = 90
ACTIVITY_THRESHOLD = 100


def create_impact_stories_notification_if_needed():
    """
    Evaluate the impact-stories trigger conditions and create a LocalNotification
    row if eligible. Returns True if a row was created, False otherwise.
    """
    if LocalNotification.objects.filter(key=IMPACT_STORIES_KEY).exists():
        return False
    if FacilityDataset.objects.filter(registered=True).exists():
        return False
    cutoff = local_now() - timedelta(days=ROLLING_WINDOW_DAYS)
    # Bound the scan to ACTIVITY_THRESHOLD rows — we only need to know whether
    # the count crosses the threshold, not its exact value. On facilities with
    # millions of session logs this avoids a full scan of an un-indexed column.
    recent = ContentSessionLog.objects.filter(start_timestamp__gte=cutoff)
    if recent[:ACTIVITY_THRESHOLD].count() < ACTIVITY_THRESHOLD:
        return False
    LocalNotification.objects.create(key=IMPACT_STORIES_KEY)
    return True
