from __future__ import absolute_import, print_function, unicode_literals

import datetime
import random

from django.db.models import Max, Min, Sum
from django.db.models.query import F
from kolibri.auth.filters import HierarchyRelationsFilter
from kolibri.auth.models import Classroom, Facility, FacilityUser
from kolibri.content.models import ContentNode
from kolibri.logger.models import AttemptLog, ContentSessionLog, ContentSummaryLog, MasteryLog
from le_utils.constants import content_kinds


def get_or_create_facilities(**options):
    n_facilities = options['n_facilities']
    n_on_device = Facility.objects.all().count()
    n_to_create = n_facilities - n_on_device
    if n_to_create > 0:
        print('Generating {n} facility object(s)'.format(n=n_to_create))
        for i in range(0, n_to_create):
            Facility.objects.create(name='Test Facility {i}'.format(i=i + 1))
    return Facility.objects.all()[0:n_facilities]


def get_or_create_classrooms(**options):
    n_classes = options['n_classes']
    facility = options['facility']
    n_on_device = Classroom.objects.filter(parent=facility).count()
    n_to_create = n_classes - n_on_device
    if n_to_create > 0:
        print('Generating {n} classroom object(s) for facility: {name}'.format(
            n=n_to_create,
            name=facility.name,
        ))
        for i in range(0, n_to_create):
            Classroom.objects.create(
                parent=facility,
                name='Classroom {i}{a}'.format(i=i + 1, a=random.choice('ABCD'))
            )
    return Classroom.objects.filter(parent=facility)[0:n_classes]


def get_or_create_classroom_users(**options):
    classroom = options['classroom']
    n_users = options['n_users']
    user_data = options['user_data']
    facility = options['facility']

    # The headers in the user_data.csv file that we use to generate user Full Names
    # Note, we randomly pick from these to give deliberately varied (and sometimes idiosyncratic)
    # Full names - because we should never assume that users have names like us
    user_data_name_fields = ["GivenName", "MiddleInitial", "Surname"]

    n_in_classroom = HierarchyRelationsFilter(FacilityUser.objects.all()).filter_by_hierarchy(
        ancestor_collection=classroom,
        target_user=F("id"),
    ).count()

    # Only generate new users if there are fewer users than requested.
    n_to_create = n_users - n_in_classroom
    if n_to_create > 0:
        print('Generating {n} user object(s) for class: {classroom} in facility: {facility}'.format(
            n=n_to_create,
            classroom=classroom,
            facility=facility,
        ))
        for i in range(0, n_to_create):
            # Get the first base data that does not have a matching user already
            base_data = user_data[n_in_classroom + i]
            # Randomly create the name from 1 to 3 of the three user name fields
            name = " ".join([base_data[key] for key in random.sample(user_data_name_fields, random.randint(1, 3))])
            user = FacilityUser.objects.create(
                facility=facility,
                full_name=name,
                username=base_data['Username']
            )
            # Set a dummy password so that if we want to login as this learner later, we can.
            user.set_password('password')
            user.save()

            # Add the user to the current classroom
            classroom.add_member(user)

    return HierarchyRelationsFilter(FacilityUser.objects.all()).filter_by_hierarchy(
        target_user=F("id"),
        ancestor_collection=classroom,
    )[0:n_users]


def add_channel_activity_for_user(**options): # noqa: max-complexity=16
    n_content_items = options['n_content_items']
    channel = options['channel']
    user = options['user']
    now = options['now']

    channel_id = channel.id
    default_channel_content = ContentNode.objects.exclude(kind=content_kinds.TOPIC).filter(channel_id=channel_id)

    print('Generating {i} user interaction(s) for user: {user} for channel: {channel}'.format(
        i=n_content_items,
        user=user,
        channel=channel.name
    ))
    # Generate a content interaction history for this many content items
    for i in range(0, n_content_items):
        # Use this to randomly select a content node to generate the interaction for
        index = random.randint(0, default_channel_content.count() - 1)
        random_node = default_channel_content[index]

        # We will generate between 1 and 5 content session logs for this content item
        session_logs = []

        for j in range(0, random.randint(1, 5)):
            # How many minutes did they spend in this session? Up to 15
            duration = random.random() * 15
            # Assume they spent some of this session time not doing anything - the lazy...
            idle_time = random.random() * duration
            session_logs.append(ContentSessionLog(
                user=user,
                channel_id=channel_id,
                content_id=random_node.content_id,
                start_timestamp=now - datetime.timedelta(i + j, 0, duration),
                end_timestamp=now - datetime.timedelta(i + j),
                # How many seconds did they actually spend doing something?
                time_spent=(duration - idle_time) * 60,
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

                    start_timestamp = session_log.end_timestamp - (timespan / n) * (j + 1)

                    end_timestamp = session_log.end_timestamp - (timespan / n) * j

                    # If incorrect, must have made at least two attempts at the question
                    question_attempts = 1 if correct else random.randint(2, 5)

                    question_interval = (end_timestamp - start_timestamp) / question_attempts

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
                                'timestamp': start_timestamp + question_interval * (att + 1),
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
