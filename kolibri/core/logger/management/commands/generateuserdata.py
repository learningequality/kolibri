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
            "--users",
            type=int,
            default=20,
            dest="users",
            help="Users to be created per class.",
        )
        # How many classes to generate and generate data for
        parser.add_argument(
            "--classes",
            type=int,
            default=2,
            dest="classes",
            help="Classes to be created per facility.",
        )
        # Slightly different from above, in that it will only generate new facilities if there are fewer facilities
        # on the device than specified
        parser.add_argument(
            "--facilities",
            type=int,
            default=1,
            dest="facilities",
            help="Number of facilities to create.",
        )
        parser.add_argument(
            "--no-onboarding",
            action="store_true",
            dest="no_onboarding",
            help="Automatically create superusers and skip onboarding.",
        )
        parser.add_argument(
            "--num-content-items",
            type=int,
            dest="num_content_items",
            help="Number of content interactions per user.",
        )
        parser.add_argument(
            "--num-lessons",
            type=int,
            default=5,
            dest="num_lessons",
            help="Number of lessons to be created per class.",
        )
        parser.add_argument(
            "--num-exams",
            type=int,
            default=2,
            dest="num_exams",
            help="Number of exams to be created per class.",
        )
        parser.add_argument(
            "--max-channels",
            type=int,
            default=2,
            dest="max_channels",
            help="Maximum number of channels to add activities to.",
        )
        # TODO(cpauya):
        # parser.add_argument(
        #     "--num-groups",
        #     type=int,
        #     default=2,
        #     dest="num_groups",
        #     help="Number of groups to be created per class.",
        # )
        parser.add_argument(
            "--device-name",
            type=str,
            default="",
            dest="device_name",
            help="Device name to use for this instance. This will be prefixed to the facilities, classes, and users to be created.",
        )
        # TODO(cpauya):
        # parser.add_argument(
        #     "--channel-token",
        #     type=str,
        #     default="",
        #     dest="channel_token",
        #     help="Process learner activities only for the channel with this token.  Overrides the max_channels argument.",
        # )

    def handle(self, *args, **options):
        # Load in the user data from the csv file to give a predictable source of user data
        data_path = os.path.join(os.path.dirname(__file__), "user_data.csv")
        with io.open(data_path, mode="r", encoding="utf-8") as f:
            user_data = [data for data in csv.DictReader(f)]

        n_seed = options["seed"]
        n_facilities = options["facilities"]
        n_users = options["users"]
        n_classes = options["classes"]
        no_onboarding = options["no_onboarding"]
        num_content_items = options["num_content_items"]
        num_lessons = options["num_lessons"]
        num_exams = options["num_exams"]
        max_channels = options["max_channels"]
        device_name = options["device_name"]
        verbosity = options.get("verbosity", 1)
        # TODO(cpauya):
        # num_groups = options["num_groups"]
        # channel_token = options["channel_token"]

        # TODO(cpauya): Default to the computer/VM name so we get a unique name for each VM automatically.
        # if not device_name:
        #     # Default to computer name.
        #     # REF: https://stackoverflow.com/questions/4271740/how-can-i-use-python-to-get-the-system-hostname#4271755
        #     import socket
        #     device_name = socket.gethostname()
        #     utils.logger_info("Defaulting 'device_name' to '{0}'.".format(device_name))

        # Set the random seed so that all operations will be randomized predictably
        random.seed(n_seed)

        # Generate data up to the current time
        now = timezone.now()

        facilities = utils.get_or_create_facilities(
            n_facilities=n_facilities, device_name=device_name, verbosity=verbosity
        )

        # Device needs to be provisioned before adding superusers
        if no_onboarding:
            utils.logger_info(
                "Provisioning device. Onboarding will be skipped after starting server.",
                verbosity=verbosity,
            )
            provision_device()

        for facility in facilities:
            if no_onboarding:
                utils.logger_info(
                    'Creating superuser "superuser" with password "password" at facility {facility}.'.format(
                        facility=facility.name
                    ),
                    verbosity=verbosity,
                )
                create_superuser(facility=facility)

            classrooms = utils.get_or_create_classrooms(
                n_classes=n_classes,
                facility=facility,
                device_name=device_name,
                verbosity=verbosity,
            )

            # TODO(cpauya):
            # if channel_token:
            #     # TODO(cpauya): which table do we get the channel_token field?
            #     channels = ChannelMetadata.objects.filter(channel_token=channel_token)
            # else:
            #     channels = ChannelMetadata.objects.all()[:max_channels]

            channels = ChannelMetadata.objects.all()
            if max_channels and max_channels > 0:
                channels = channels[:max_channels]

            if not channels:
                utils.logger_info(
                    "No channels found, cannot add channel activities for learners.",
                    verbosity=verbosity,
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
                    device_name=device_name,
                    verbosity=verbosity,
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
                    utils.logger_info(
                        "    Learner {learner}...".format(learner=user),
                        verbosity=verbosity,
                    )
                    for channel in channels:
                        # TODO(cpauya): check for issue as per Richard's report
                        # REF: https://github.com/learningequality/kolibri/pull/6983#issuecomment-638980072
                        utils.logger_info(
                            "      ==> Adding {channel} channel activity for learner {learner}...".format(
                                channel=channel, learner=user
                            ),
                            verbosity=verbosity,
                        )
                        utils.add_channel_activity_for_user(
                            n_content_items=n_content_items,
                            channel=channel,
                            user=user,
                            now=now,
                            verbosity=verbosity,
                        )

                # create lessons
                utils.create_lessons_for_classroom(
                    classroom=classroom,
                    facility=facility,
                    channels=ChannelMetadata.objects.all(),
                    lessons=num_lessons,
                    now=now,
                    verbosity=verbosity,
                )

                # create exams
                utils.create_exams_for_classrooms(
                    classroom=classroom,
                    facility=facility,
                    channels=ChannelMetadata.objects.all(),
                    exams=num_exams,
                    now=now,
                    device_name=device_name,
                    verbosity=verbosity,
                )

                # # TODO(cpauya): create groups
                # utils.create_groups_for_classrooms(
                #     classroom=classroom,
                #     facility=facility,
                #     channels=ChannelMetadata.objects.all(),
                #     num_groups=num_groups,
                #     now=now,
                #     device_name=device_name,
                # )
