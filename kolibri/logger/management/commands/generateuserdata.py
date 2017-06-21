from __future__ import absolute_import, print_function, unicode_literals

import csv
import datetime
import logging
import os
import random
import string

from django.core.management.base import BaseCommand
from django.utils import timezone
from kolibri.auth.models import Classroom, Facility, FacilityUser
from kolibri.content.content_db_router import set_active_content_database
from kolibri.content.models import ChannelMetadataCache, ContentNode
from kolibri.logger.models import AttemptLog, ContentSessionLog, ContentSummaryLog, MasteryLog
from le_utils.constants import content_kinds

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Creates plausible data for front end testing of the app'

    def add_arguments(self, parser):
        parser.add_argument('--seed', type=int, default=1, dest="seed", help="Random seed")
        parser.add_argument('--users', type=int, default=20, dest="users", help="Users per class")
        parser.add_argument('--classes', type=int, default=2, dest="classes", help="Classes per facility")
        parser.add_argument('--facilities', type=int, default=1, dest="facilities", help="Number of facilities")

    def handle(self, *args, **options):  # noqa: max-complexity=16
        user_data_name_fields = [
            "GivenName",
            "MiddleInitial",
            "Surname",
        ]
        with open(os.path.join(os.path.dirname(__file__), 'user_data.csv')) as f:
            user_data = [data for data in csv.DictReader(f)]
        random.seed(options['seed'])

        channel_id = ChannelMetadataCache.objects.all()[0].id
        set_active_content_database(channel_id)
        default_channel_content = ContentNode.objects.exclude(kind=content_kinds.TOPIC)

        num_facilities = Facility.objects.all().count()

        if num_facilities < options['facilities']:
            num_to_create = options['facilities'] - num_facilities
            logging.info('Generating {i} facility object(s)'.format(i=num_to_create))
            facilities = [Facility.objects.create(name='Test Facility {i}'.format(i=i+1)) for i in range(0, num_to_create)]
        facilities = Facility.objects.all()[0:options['facilities']]

        now = timezone.now()

        for facility in facilities:
            facility.save()
            logging.info('Generating {i} classroom object(s) for facility: {facility}'.format(
                i=options['classes'],
                facility=facility,
            ))
            classes = [
                Classroom(
                    name='Classroom {i}{a}'.format(i=i+1, a=random.choice(string.ascii_uppercase)),
                    parent=facility,
                ) for i in range(0, options['classes'])]
            facility_user_data = random.sample(user_data, options['classes'] * options['users'])

            for i, classroom in enumerate(classes):
                classroom.save()
                logging.info('Generating {i} user object(s) for classroom: {classroom}'.format(
                    i=options['users'],
                    classroom=classroom,
                ))
                for base_data in facility_user_data[i*options['users']: (i+1)*options['users']]:
                    name = " ".join([base_data[key] for key in random.sample(user_data_name_fields, random.randint(1, 3))])
                    user, created = FacilityUser.objects.get_or_create(facility=facility, full_name=name, username=base_data['Username'])
                    user.set_password('django')
                    classroom.add_member(user)
                    number_of_interactions = int(base_data['Age'])
                    logging.info('Generating {i} user interaction(s) for user: {user}'.format(
                        i=number_of_interactions,
                        user=user,
                    ))
                    for i in range(0, number_of_interactions):
                        index = random.randint(0, default_channel_content.count() - 1)
                        random_node = default_channel_content[index]
                        session_logs = []
                        for j in range(0, random.randint(1, 5)):
                            duration = random.random()*15
                            idle_time = random.random() * duration
                            session_logs.append(ContentSessionLog(
                                user=user,
                                channel_id=channel_id,
                                content_id=random_node.content_id,
                                start_timestamp=now - datetime.timedelta(i + j, 0, duration),
                                end_timestamp=now - datetime.timedelta(i + j),
                                time_spent=(duration - idle_time)*60,
                                progress=random.random(),
                                kind=random_node.kind,
                            ))
                        completion_timestamp = None
                        cumulative_progress = 0
                        for session_log in session_logs:
                            cumulative_progress = min(cumulative_progress + session_log.progress, 1.0)
                            if cumulative_progress >= 1.0:
                                completion_timestamp = session_log.end_timestamp
                            session_log.save()

                        summary_log, created = ContentSummaryLog.objects.get_or_create(
                            user=user,
                            kind=random_node.kind,
                            content_id=random_node.content_id,
                            defaults={
                                'channel_id': channel_id,
                                'start_timestamp': min(session_logs, key=lambda x: x.start_timestamp).start_timestamp,
                                'end_timestamp': max(session_logs, key=lambda x: x.end_timestamp).end_timestamp,
                                'completion_timestamp': completion_timestamp,
                                'time_spent': sum(session_log.time_spent for session_log in session_logs),
                                'progress': min(sum(session_log.progress for session_log in session_logs), 1.0),
                            }
                        )

                        if random_node.kind == content_kinds.EXERCISE:
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
                            for i, session_log in enumerate(reversed(session_logs)):
                                # Always make students get the last 5 correct
                                if i == 0:
                                    n = 5
                                else:
                                    n = random.randint(1, 5)
                                timespan = session_log.end_timestamp - session_log.start_timestamp
                                for j in range(0, n):
                                    if i == 0:
                                        correct = True
                                    else:
                                        # Only let students get odd indexed questions right
                                        correct = i % 2 == 1
                                    AttemptLog.objects.create(
                                        item='',
                                        start_timestamp=session_log.end_timestamp - (timespan/n)*(i+1),
                                        end_timestamp=session_log.end_timestamp - (timespan/n)*i,
                                        time_spent=timespan.total_seconds(),
                                        complete=True,
                                        correct=correct,
                                        hinted=random.choice((False, not correct)),
                                        answer={},
                                        simple_answer='',
                                        interaction_history=([] if correct else [{'correct': False}]*random.randint(1, 5)) + [{'correct': True}],
                                        user=user,
                                        masterylog=mastery_log,
                                        sessionlog=session_log,
                                    )
