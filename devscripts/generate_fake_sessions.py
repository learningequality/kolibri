"""
Script to generate ContentSessionLog entries for testing

Usage:
    python devscripts/generate_fake_sessions.py

Notes:
- All session logs are tied to a content item and a test user.
- Timestamps are spread throughout the current day.
- Requires imported content with at least one exercise.

This script is intended for development and benchmarking only.
"""

import os
import random
import uuid
from datetime import timedelta

from django.utils import timezone

from kolibri.utils.cli import initialize

initialize()

from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.auth.models import FacilityUser, Facility
from kolibri.core.content.models import ChannelMetadata, ContentNode
from django.db import transaction

NUM_ROWS = 10000  # Set the number of rows to generate

def main():

    channel_id = ChannelMetadata.objects.values_list("id", flat=True).first()
    content_id = ContentNode.objects.filter(kind="exercise").values_list("content_id", flat=True).first()

    if not channel_id or not content_id:
        print("Error: No valid channel or exercise content found.")
        return

    # Get or create facility and test user
    facility = Facility.objects.first()
    if not facility:
        print("No facility found. Please create one via the UI first.")
        return

    user, _ = FacilityUser.objects.get_or_create(
        username="testuser",
        defaults={"facility": facility}
    )

    dataset_id = uuid.UUID(str(user.dataset_id))
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    logs = []
    for i in range(NUM_ROWS):
        start = today_start + timedelta(seconds=random.randint(0, 86400))
        end = start + timedelta(minutes=random.randint(1, 10))

        log = ContentSessionLog(
            id=uuid.uuid4(),
            user=user,
            dataset_id=dataset_id,
            channel_id=channel_id,
            content_id=content_id,
            kind="exercise",
            start_timestamp=start,
            end_timestamp=end,
            time_spent=(end - start).seconds,
            progress=random.uniform(0.0, 1.0),
            extra_fields={"source": "test"}
        )

        logs.append(log)

        if len(logs) >= 1000:
            # Optional: sanity check
            for check in logs:
                assert isinstance(check.id, uuid.UUID)
                assert isinstance(check.dataset_id, uuid.UUID)

            with transaction.atomic():
                ContentSessionLog.objects.bulk_create(logs)
            print("Inserted {} logs...".format(i + 1))
            logs = []

    if logs:
        with transaction.atomic():
            ContentSessionLog.objects.bulk_create(logs)
        print("Final batch inserted.")

    print("Done. {} content session logs inserted for user 'testuser'.".format(NUM_ROWS))

if __name__ == "__main__":
    main()
