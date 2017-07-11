from __future__ import absolute_import, print_function, unicode_literals

import csv
import datetime
import os
import random
import string

from django.core.management.base import BaseCommand
from django.db.models import Max, Min, Sum
from django.db.models.query import F
from django.utils import timezone
from kolibri.auth.filters import HierarchyRelationsFilter
from kolibri.auth.models import Classroom, Facility, FacilityUser
from kolibri.content.content_db_router import set_active_content_database
from kolibri.content.models import ChannelMetadataCache, ContentNode
from kolibri.logger.models import AttemptLog, ContentSessionLog, ContentSummaryLog, MasteryLog
from le_utils.constants import content_kinds


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

    def handle(self, *args, **options):  # noqa: max-complexity=16

        # The headers in the user_data.csv file that we use to generate user Full Names
        # Note, we randomly pick from these to give deliberately varied (and sometimes idiosyncratic)
        # Full names - because we should never assume that users have names like us
        user_data_name_fields = [
            "GivenName",
            "MiddleInitial",
            "Surname",
        ]

        # Load in the user data from the csv file to give a predictable source of user data
        with open(os.path.join(os.path.dirname(__file__), 'user_data.csv')) as f:
            user_data = [data for data in csv.DictReader(f)]
        # Set the random seed so that all operations will be randomized predictably
        random.seed(options['seed'])

        num_facilities = Facility.objects.all().count()

        # Only generate new facilities if there are fewer facilities than requested.

        if num_facilities < options['facilities']:
            num_to_create = options['facilities'] - num_facilities
            self.stdout.write('Generating {i} facility object(s)'.format(i=num_to_create))
            facilities = [Facility.objects.create(name='Test Facility {i}'.format(i=i+1)) for i in range(0, num_to_create)]
        facilities = Facility.objects.all()[0:options['facilities']]

        # Generate data up to the current time

        now = timezone.now()

        for facility in facilities:

            num_classes = Classroom.objects.filter(parent=facility).count()

            # Only generate new classes if there are fewer classes than requested.

            if num_classes < options['classes']:
                num_to_create = options['classes'] - num_classes
                self.stdout.write('Generating {i} classroom object(s) for facility: {facility}'.format(
                    i=num_to_create,
                    facility=facility,
                ))
                for i in range(0, num_to_create):
                    Classroom.objects.create(
                        parent=facility,
                        name='Classroom {i}{a}'.format(i=i+1, a=random.choice(string.ascii_uppercase))
                    )
            classes = Classroom.objects.filter(parent=facility)[0:options['classes']]

            # Get all the user data at once so that it is distinct across classes
            facility_user_data = random.sample(user_data, options['classes'] * options['users'])

            for i, classroom in enumerate(classes):

                classroom_user_data = facility_user_data[i*options['users']: (i+1)*options['users']]

                num_users = HierarchyRelationsFilter(FacilityUser.objects.all()).filter_by_hierarchy(
                    target_user=F("id"),
                    ancestor_collection=classroom,
                ).count()

                # Only generate new users if there are fewer users than requested.

                if num_users < options['users']:
                    num_to_create = options['users'] - num_users
                    self.stdout.write('Generating {i} user object(s) for class: {classroom} in facility: {facility}'.format(
                        i=num_to_create,
                        classroom=classroom,
                        facility=facility,
                    ))
                    for i in range(0, num_to_create):
                        # Get the first base data that does not have a matching user already
                        base_data = classroom_user_data[num_users + i]
                        # Randomly create the name from 1 to 3 of the three user name fields
                        name = " ".join([base_data[key] for key in random.sample(user_data_name_fields, random.randint(1, 3))])
                        user = FacilityUser.objects.create(facility=facility, full_name=name, username=base_data['Username'])
                        # Set a dummy password so that if we want to login as this learner later, we can.
                        user.set_password('password')
                        # Add the user to the current classroom
                        classroom.add_member(user)
                users = HierarchyRelationsFilter(FacilityUser.objects.all()).filter_by_hierarchy(
                    target_user=F("id"),
                    ancestor_collection=classroom,
                )[0:options['users']]

                # Iterate through the slice of the facility_user_data specific to this classroom
                for user, base_data in zip(users, classroom_user_data):

                    # The user data we are fetching from has 'Age' as a characteristic, use this as the "age" of the user
                    # in terms of their content interaction history - older, more content items interacted with!
                    number_of_content_items = int(base_data['Age'])

                    # Loop over all local channels to generate data for each channel

                    for channel in ChannelMetadataCache.objects.all():
                        channel_id = channel.id
                        set_active_content_database(channel_id)
                        default_channel_content = ContentNode.objects.exclude(kind=content_kinds.TOPIC)

                        self.stdout.write('Generating {i} user interaction(s) for user: {user} for channel: {channel}'.format(
                            i=number_of_content_items,
                            user=user,
                            channel=channel.name
                        ))
                        # Generate a content interaction history for this many content items
                        for i in range(0, number_of_content_items):
                            # Use this to randomly select a content node to generate the interaction for
                            index = random.randint(0, default_channel_content.count() - 1)
                            random_node = default_channel_content[index]

                            # We will generate between 1 and 5 content session logs for this content item
                            session_logs = []
                            for j in range(0, random.randint(1, 5)):
                                # How many minutes did they spend in this session? Up to 15
                                duration = random.random()*15
                                # Assume they spent some of this session time not doing anything - the lazy...
                                idle_time = random.random() * duration
                                session_logs.append(ContentSessionLog(
                                    user=user,
                                    channel_id=channel_id,
                                    content_id=random_node.content_id,
                                    start_timestamp=now - datetime.timedelta(i + j, 0, duration),
                                    end_timestamp=now - datetime.timedelta(i + j),
                                    # How many seconds did they actually spend doing something?
                                    time_spent=(duration - idle_time)*60,
                                    progress=random.random(),
                                    kind=random_node.kind,
                                ))
                            # Assume they have not completed
                            completion_timestamp = None
                            cumulative_progress = 0
                            # Go through all the session logs and add up the progress in each
                            for session_log in session_logs:
                                cumulative_progress = min(cumulative_progress + session_log.progress, 1.0)
                                # If the progress is 1 or more, they have completed! Set the completion timestamp
                                # For the end of this session, for the sake of argument.
                                if cumulative_progress >= 1.0:
                                    completion_timestamp = session_log.end_timestamp
                                session_log.save()

                            # Now that we have created all the Session Logs, infer the summary log from them
                            summary_log, created = ContentSummaryLog.objects.get_or_create(
                                user=user,
                                kind=random_node.kind,
                                content_id=random_node.content_id,
                                # Use defaults here so that we don't try to create a new Summary Log with the same
                                # kind/content_id/user combo, as this would violate uniqueness constraints
                                defaults={
                                    'channel_id': channel_id,
                                    # Start timestamp is the earliest start timestamp of the session logs
                                    'start_timestamp': min(session_logs, key=lambda x: x.start_timestamp).start_timestamp,
                                    # End timestamp is the latest of all the end timestamps
                                    'end_timestamp': max(session_logs, key=lambda x: x.end_timestamp).end_timestamp,
                                    'completion_timestamp': completion_timestamp,
                                    'time_spent': sum(session_log.time_spent for session_log in session_logs),
                                    'progress': min(sum(session_log.progress for session_log in session_logs), 1.0),
                                }
                            )

                            if not created:
                                # We didn't create the summary log this time, so it probably means it has other session logs
                                # Aggregate the information from there to update the relevant fields on the summary log
                                updates = ContentSessionLog.objects.filter(
                                    user=user,
                                    kind=random_node.kind,
                                    content_id=random_node.content_id
                                ).aggregate(
                                    start_timestamp=Min('start_timestamp'),
                                    end_timestamp=Max('end_timestamp'),
                                    progress=Sum('progress')

                                )

                                summary_log.start_timestamp = updates['start_timestamp']
                                summary_log.end_timestamp = updates['end_timestamp']
                                if summary_log.progress < 1.0 and updates['progress'] >= 1.0:
                                    # If it was not previously completed, and is now, set the completion timestamp to the
                                    # final end timestamp of the session logs.
                                    summary_log.completion_timestamp = updates['end_timestamp']
                                summary_log.progress = min(1.0, updates['progress'])
                                summary_log.save()

                            # If we are dealing with anything but an assessment (currently only exercises)
                            # we are done - if not, create additional data here
                            if random_node.kind == content_kinds.EXERCISE:
                                # Generate a mastery log if needed
                                mastery_log, created = MasteryLog.objects.get_or_create(
                                    user=user,
                                    mastery_level=1,
                                    summarylog=summary_log,
                                    defaults={
                                        'start_timestamp': summary_log.start_timestamp,
                                        'end_timestamp': summary_log.end_timestamp,
                                        'complete': summary_log.progress >= 1.0,
                                        'completion_timestamp': completion_timestamp,
                                        'mastery_criterion': {
                                            'm': 5,
                                            'n': 5,
                                            'type': 'm_of_n',
                                        },
                                    }
                                )

                                if not created:
                                    # Not created, so update relevant fields on it based on new interactions
                                    if not mastery_log.complete and summary_log.progress >= 1.0:
                                        mastery_log.complete = True
                                        mastery_log.completion_timestamp = summary_log.completion_timestamp
                                    mastery_log.end_timestamp = summary_log.end_timestamp

                                # Get the list of assessment item ids from the assessment meta data
                                assessment_item_ids = random_node.assessmentmetadata.first().assessment_item_ids

                                for i, session_log in enumerate(reversed(session_logs)):
                                    # Always make students get 5 attempts correct in the most recent session
                                    # if the exercise is complete
                                    complete = (i == 0 and mastery_log.complete)
                                    if complete:
                                        n = 5
                                    else:
                                        # Otherwise, let them have answered between 1 and 5 questions per session
                                        n = random.randint(1, 5)
                                    # How long did they spend on these n questions?
                                    timespan = session_log.end_timestamp - session_log.start_timestamp
                                    # Index through each individual question
                                    for j in range(0, n):
                                        if complete:
                                            # If this is the session where they completed the exercise, always
                                            # make them get it right
                                            correct = True
                                        else:
                                            # Otherwise only let students get odd indexed questions right,
                                            # ensuring they will always have a mastery breaking sequence
                                            # as zero based indexing means their first attempt will always be wrong!
                                            correct = j % 2 == 1

                                        start_timestamp = session_log.end_timestamp - (timespan/n)*(j+1)

                                        end_timestamp = session_log.end_timestamp - (timespan/n)*j

                                        # If incorrect, must have made at least two attempts at the question
                                        question_attempts = 1 if correct else random.randint(2, 5)

                                        question_interval = (end_timestamp - start_timestamp)/question_attempts

                                        # If they got it wrong, give 20/80 chance that they took a hint to do so
                                        hinted = random.choice((False, False, False, False, not correct))
                                        if hinted:
                                            first_interaction = {
                                                'correct': False,
                                                'type': 'hint',
                                            }
                                        else:
                                            first_interaction = {
                                                'correct': correct,
                                                'type': 'answer',
                                            }
                                        first_interaction.update({
                                            'answer': {},
                                            'timestamp': start_timestamp + question_interval
                                        })

                                        interaction_history = [first_interaction]

                                        # If it is correct, this can be our only response, otherwise, add more.
                                        if not correct:
                                            for att in range(1, question_attempts - 1):
                                                # Add on additional attempts for intervening incorrect responses
                                                interaction_history += [{
                                                    'correct': False,
                                                    'type': 'answer',
                                                    'answer': {},
                                                    'timestamp': start_timestamp + question_interval*(att + 1),
                                                }]
                                            # Finally, add a correct response that allows the user to move onto the next question
                                            interaction_history += [{
                                                'correct': True,
                                                'type': 'answer',
                                                'answer': {},
                                                'timestamp': end_timestamp,
                                            }]

                                        AttemptLog.objects.create(
                                            # Choose a random assessment item id from the exercise
                                            item=random.choice(assessment_item_ids),
                                            # Just let each attempt be a fixed proportion of the total time spent on the exercise
                                            start_timestamp=start_timestamp,
                                            end_timestamp=end_timestamp,
                                            time_spent=timespan.total_seconds(),
                                            # Mark all attempts as complete, as assume that student gave correct answer eventually
                                            complete=True,
                                            # Mark as correct or incorrect
                                            correct=correct,
                                            hinted=hinted,
                                            # We can't meaningfully generate fake answer data for Perseus exercises
                                            # (which are currently our only exercise type) - so don't bother.
                                            answer={},
                                            simple_answer='',
                                            interaction_history=interaction_history,
                                            user=user,
                                            masterylog=mastery_log,
                                            sessionlog=session_log,
                                        )
