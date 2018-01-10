from __future__ import absolute_import, print_function, unicode_literals

import csv
import os
import random

from django.core.management.base import BaseCommand
from django.utils import timezone
from kolibri.auth.test.helpers import create_superuser, provision_device
from kolibri.content.models import ChannelMetadata
from kolibri.logger.utils import user_data as utils


class Command(BaseCommand):
    help = 'Creates plausible data for front end testing of the app'

    def add_arguments(self, parser):
        # Allow data to be (re-)generated in a fairly predictable way
        parser.add_argument('--seed', type=int, default=1, dest="seed", help="Random seed")
        # Specify a set number of users to generate data for per class
        parser.add_argument('--users', type=int, default=20, dest="users", help="Users per class")
        # How many classes to generate and generate data for
        parser.add_argument('--classes', type=int, default=2, dest="classes", help="Classes per facility")
        # Slightly different from above, in that it will only generate new facilities if there are fewer facilities
        # on the device than specified
        parser.add_argument('--facilities', type=int, default=1, dest="facilities", help="Number of facilities")
        parser.add_argument('--no-onboarding', action='store_true', dest="no_onboarding", help="Automatically create superusers and skip onboarding")
        parser.add_argument('--num-content-items', type=int, dest='num_content_items', help="Number of content interactions per user")

    def handle(self, *args, **options):
        # Load in the user data from the csv file to give a predictable source of user data
        with open(os.path.join(os.path.dirname(__file__), 'user_data.csv')) as f:
            user_data = [data for data in csv.DictReader(f)]

        n_users = options['users']
        n_classes = options['classes']
        no_onboarding = options['no_onboarding']
        num_content_items = options['num_content_items']

        # Set the random seed so that all operations will be randomized predictably
        random.seed(options['seed'])

        # Generate data up to the current time
        now = timezone.now()

        facilities = utils.get_or_create_facilities(n_facilities=options['facilities'])

        # Device needs to be provisioned before adding superusers
        if no_onboarding:
            print('Provisioning device. Onboarding will be skipped after starting server.')
            provision_device()

        for facility in facilities:
            if no_onboarding:
                print('Creating superuser "superuser" with password "password" at facility {facility}.'.format(facility=facility.name))
                create_superuser(facility=facility)

            classrooms = utils.get_or_create_classrooms(
                n_classes=n_classes,
                facility=facility,
            )

            # Get all the user data at once so that it is distinct across classrooms
            facility_user_data = random.sample(user_data, n_classes * n_users)

            for i, classroom in enumerate(classrooms):
                classroom_user_data = facility_user_data[i * n_users: (i + 1) * n_users]
                users = utils.get_or_create_classroom_users(
                    n_users=n_users,
                    classroom=classroom,
                    user_data=classroom_user_data,
                    facility=facility
                )

                # Iterate through the slice of the facility_user_data specific to this classroom
                for user, base_data in zip(users, classroom_user_data):
                    # The user data we are fetching from has 'Age' as a characteristic, use this as the "age" of the user
                    # in terms of their content interaction history - older, more content items interacted with!
                    if num_content_items:
                        n_content_items = num_content_items
                    else:
                        n_content_items = int(base_data['Age'])

                    # Loop over all local channels to generate data for each channel
                    for channel in ChannelMetadata.objects.all():
                        utils.add_channel_activity_for_user(
                            n_content_items=n_content_items,
                            channel=channel,
                            user=user,
                            now=now
                        )
