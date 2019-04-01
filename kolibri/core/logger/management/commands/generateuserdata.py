from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import csv
import io
import logging
import os
import random

from django.core.management.base import BaseCommand
from django.utils import timezone

from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.logger.utils import user_data as utils


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Creates plausible data for front end testing of the app"

    def add_arguments(self, parser):
        # Allow data to be (re-)generated in a fairly predictable way
        parser.add_argument(
            "--seed", type=int, default=1, dest="seed", help="Random seed"
        )
        # Specify a set number of users to generate data for per class
        parser.add_argument(
            "--users", type=int, default=20, dest="users", help="Users per class"
        )
        # How many classes to generate and generate data for
        parser.add_argument(
            "--classes",
            type=int,
            default=2,
            dest="classes",
            help="Classes per facility",
        )
        # Slightly different from above, in that it will only generate new facilities if there are fewer facilities
        # on the device than specified
        parser.add_argument(
            "--facilities",
            type=int,
            default=1,
            dest="facilities",
            help="Number of facilities",
        )
        parser.add_argument(
            "--no-onboarding",
            action="store_true",
            dest="no_onboarding",
            help="Automatically create superusers and skip onboarding",
        )
        parser.add_argument(
            "--num-content-items",
            type=int,
            dest="num_content_items",
            help="Number of content interactions per user",
        )
        parser.add_argument(
            "--num-lessons",
            type=int,
            default=5,
            dest="num_lessons",
            help="Number of lessons to be created per class",
        )
        parser.add_argument(
            "--num-exams",
            type=int,
            default=2,
            dest="num_exams",
            help="Number of exams to be created per class",
        )

    def handle(self, *args, **options):
        # Load in the user data from the csv file to give a predictable source of user data
        data_path = os.path.join(os.path.dirname(__file__), "user_data.csv")
        with io.open(data_path, mode="r", encoding="utf-8") as f:
            user_data = [data for data in csv.DictReader(f)]

        n_users = options["users"]
        n_classes = options["classes"]
        no_onboarding = options["no_onboarding"]
        num_content_items = options["num_content_items"]
        num_lessons = options["num_lessons"]
        num_exams = options["num_exams"]

        # Set the random seed so that all operations will be randomized predictably
        random.seed(options["seed"])

        # Generate data up to the current time
        now = timezone.now()

        facilities = utils.get_or_create_facilities(n_facilities=options["facilities"])

        # Device needs to be provisioned before adding superusers
        if no_onboarding:
            logger.info(
                "Provisioning device. Onboarding will be skipped after starting server."
            )
            provision_device()

        for facility in facilities:
            if no_onboarding:
                logger.info(
                    'Creating superuser "superuser" with password "password" at facility {facility}.'.format(
                        facility=facility.name
                    )
                )
                create_superuser(facility=facility)

            classrooms = utils.get_or_create_classrooms(
                n_classes=n_classes, facility=facility
            )

            # Get all the user data at once so that it is distinct across classrooms
            facility_user_data = random.sample(user_data, n_classes * n_users)

            for i, classroom in enumerate(classrooms):
                classroom_user_data = facility_user_data[
                    i * n_users : (i + 1) * n_users
                ]
                users = utils.get_or_create_classroom_users(
                    n_users=n_users,
                    classroom=classroom,
                    user_data=classroom_user_data,
                    facility=facility,
                )

                # Iterate through the slice of the facility_user_data specific to this classroom
                for user, base_data in zip(users, classroom_user_data):
                    # The user data we are fetching from has 'Age' as a characteristic, use this as the "age" of the user
                    # in terms of their content interaction history - older, more content items interacted with!
                    if num_content_items:
                        n_content_items = num_content_items
                    else:
                        n_content_items = int(base_data["Age"])

                    # Loop over all local channels to generate data for each channel
                    for channel in ChannelMetadata.objects.all():
                        utils.add_channel_activity_for_user(
                            n_content_items=n_content_items,
                            channel=channel,
                            user=user,
                            now=now,
                        )

                # create lessons
                utils.create_lessons_for_classroom(
                    classroom=classroom,
                    facility=facility,
                    channels=ChannelMetadata.objects.all(),
                    lessons=num_lessons,
                    now=now,
                )

                # create exams
                utils.create_exams_for_classrooms(
                    classroom=classroom,
                    facility=facility,
                    channels=ChannelMetadata.objects.all(),
                    exams=num_exams,
                    now=now,
                )
