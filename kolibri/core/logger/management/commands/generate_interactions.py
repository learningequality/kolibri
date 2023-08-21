import datetime
import logging
import os
import random
import uuid

import pytz
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone
from le_utils.constants import content_kinds

from kolibri.core.auth.management.commands.generate_auth_data import generate_facility
from kolibri.core.auth.management.commands.generate_auth_data import (
    generate_facility_user,
)
from kolibri.core.auth.management.commands.generate_auth_data import read_user_data_file
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.management.commands.generate_content_data import (
    generate_channels,
)
from kolibri.core.content.management.commands.generate_content_data import (
    switch_to_memory,
)
from kolibri.core.content.models import ContentNode
from kolibri.core.logger.apps import KolibriLoggerConfig
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.models import UserSessionLog


logger = logging.getLogger(__name__)


def get_or_generate_resources(n_channels):
    nodes = ContentNode.objects.exclude(kind=content_kinds.TOPIC)
    if not nodes:
        generate_channels(n_channels=n_channels)
        return ContentNode.objects.exclude(kind=content_kinds.TOPIC)

    return nodes


def get_or_generate_new_facility():
    facilities = Facility.objects.all()
    if not facilities:
        return generate_facility("a nice Facility for interactions", "Testing device")
    return facilities[0]


def get_or_generate_facility_users(n_users, facility):
    existing_users = FacilityUser.objects.all()

    if existing_users.count() < n_users:
        new_users = []
        file_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "user_data.csv")
        )
        users_data = read_user_data_file(file_path)
        for _ in range(n_users):
            new_users.append(generate_facility_user(facility, users_data))
        return new_users

    return existing_users[:n_users]


# make default values here in case we called this function directly without the Command
def get_random_date_within_range(start=None, end=None):
    if not start:
        start = datetime.datetime(2022, 1, 1, 0, 0, 0, 0, pytz.UTC)
    if not end:
        end = timezone.now()
    return start + (end - start) * random.random()


# get completion_timestamp for ContentSummaryLog infered from ContentSessionLog
def get_completion_timestamp(content_session_logs):
    cumulative_progress = 0
    for content_log in content_session_logs:
        cumulative_progress = min(cumulative_progress + content_log.progress, 1.0)
        if cumulative_progress == 1.0:
            return content_log.end_timestamp

    return None


# get random number of content_sessions with random progress
def get_n_content_sessions(is_exercise_resource):
    random_progress_set = [random.random() for _ in range(random.randint(1, 5))]
    acc_progress = sum(random_progress_set)

    if not is_exercise_resource or acc_progress < 1.0:
        return random_progress_set

    # make those random progresses summing to 1 if it's exercise and its accumulative progress >=1
    return [progress / acc_progress for progress in random_progress_set]


def generate_attempt_log(
    user,
    start_timestamp,
    end_timestamp,
    attempt_duration,
    item,
    hinted,
    is_correct,
    completed,
    interaction_history,
    sessionlog,
    masterylog,
):
    AttemptLog.objects.create(
        user=user,
        item=item,
        start_timestamp=start_timestamp,
        end_timestamp=end_timestamp,
        time_spent=attempt_duration,
        completion_timestamp="to do",
        hinted=hinted,
        complete=completed,
        correct=is_correct,
        answer={},
        simple_answer="",
        interaction_history=interaction_history,
        error=random.choice([True, False]),
        masterylog=masterylog,
        sessionlog=sessionlog,
    )


def generate_attempts_logs_for_exercise_sessions(
    user, contentsessionlogs, masterylog, assessments
):

    exercise_completed = masterylog.complete

    for sessionlog in contentsessionlogs:

        # since mastery_criterion contains (just for now) 5 questions
        n_questions = 5

        attempt_duration_sec = sessionlog.time_spent / n_questions

        # first question attempt starts within a second after the content session starts
        start_timestamp = sessionlog.start_timestamp + datetime.timedelta(
            milliseconds=random.randint(100, 1000)
        )

        for _ in range(n_questions):
            correct_answer = random.choice([True, False])

            # if it's wrong answer then it's 1/5 probablity (low) that there is was a hint
            # else (correct_answer=True) then 'not correct_answer' evaluates to False and then no hint
            hinted = random.choices([False, not correct_answer], weights=[5, 1], k=1)[0]

            if hinted:
                first_interaction = {"correct": False, "type": "hint"}
            else:
                first_interaction = {"correct": correct_answer, "type": "answer"}

            end_timestamp = min(
                start_timestamp + datetime.timedelta(seconds=attempt_duration_sec),
                sessionlog.end_timestamp,
            )

            interaction_history = first_interaction

            AttemptLog.objects.create(
                user=user,
                item=random.choice(assessments),
                start_timestamp=min(start_timestamp, sessionlog.end_timestamp),
                end_timestamp=end_timestamp,
                time_spent=attempt_duration_sec,
                completion_timestamp=end_timestamp if exercise_completed else None,
                hinted=hinted,
                complete=exercise_completed,
                correct=correct_answer,
                answer={},
                simple_answer="",
                interaction_history=interaction_history,
                masterylog=masterylog,
                sessionlog=sessionlog,
            )
            start_timestamp += datetime.timedelta(seconds=attempt_duration_sec)


def generate_content_session_log(
    content_node,
    progress,
    start_timestamp,
    end_timestamp,
    session_active_time,
    user=None,
    visitor_id=None,
):
    return ContentSessionLog.objects.create(
        user=user,
        visitor_id=visitor_id,
        channel_id=content_node.channel_id,
        content_id=content_node.content_id,
        start_timestamp=start_timestamp,
        end_timestamp=end_timestamp,
        time_spent=session_active_time,
        progress=progress,
        kind=content_node.kind,
    )


def generate_user_content_session_logs(
    user, content_node, kolibri_user_session, user_session_duration
):
    content_session_logs = []

    content_sessions = get_n_content_sessions(
        is_exercise_resource=content_node.kind == content_kinds.EXERCISE
    )

    content_session_startime = kolibri_user_session.start_timestamp

    # divide user_session duration by the number of content_sessions to :
    # 1- get equal duration time for each content_session
    # 2- make sure each content_session duration is within the range of user_session duration in kolibri
    # better ideas ?
    diff_between_each_content_session = user_session_duration / len(content_sessions)

    for each_progress in content_sessions:

        # time of interaction with a resource up to 12 mins
        content_session_min = random.random() * 12

        # randomly decide whether idle_time is zero or a portion of session_duration_mins
        idle_time = random.choice([0, random.random() * content_session_min])

        end_timestamp = content_session_startime + datetime.timedelta(
            seconds=content_session_min * 60
        )

        content_session = generate_content_session_log(
            user=user,
            content_node=content_node,
            progress=each_progress,
            # basically making sure any timestamp doesn't exceed the max_time
            # ( which is the last_interaction_timestamp of the current user session)
            start_timestamp=min(
                content_session_startime,
                kolibri_user_session.last_interaction_timestamp,
            ),
            end_timestamp=min(
                end_timestamp, kolibri_user_session.last_interaction_timestamp
            ),
            session_active_time=(content_session_min - idle_time) * 60,
        )
        content_session_startime += datetime.timedelta(
            seconds=diff_between_each_content_session * 60
        )

        content_session_logs.append(content_session)

    return content_session_logs


def generate_visitor_content_session_logs(
    visitor_id, content_node, content_session_startime
):

    for each_progress in get_n_content_sessions(
        is_exercise_resource=content_node.kind == content_kinds.EXERCISE
    ):

        # time of interaction with a resource up to 10 mins
        content_session_min = random.random() * 10

        # randomly decide whether idle_time is zero or part of content_session_time_min
        idle_time = random.choice([0, random.random() * content_session_min])

        generate_content_session_log(
            visitor_id=visitor_id,
            content_node=content_node,
            progress=each_progress,
            start_timestamp=content_session_startime,
            end_timestamp=content_session_startime
            + datetime.timedelta(seconds=content_session_min * 60),
            session_active_time=(content_session_min - idle_time) * 60,
        )
        # since these are content sessions for a visitor so we are not constrained by a user_session_log time
        # next session start time, will be after (0:2 days, random part of a day)
        content_session_startime += datetime.timedelta(
            days=random.randint(0, 2), seconds=(1440 * random.random()) * 60
        )


def generate_content_summary_log(content_session_logs):
    return ContentSummaryLog.objects.create(
        user=content_session_logs[0].user,
        kind=content_session_logs[0].kind,
        content_id=content_session_logs[0].content_id,
        channel_id=content_session_logs[0].channel_id,
        start_timestamp=min(
            each_session.start_timestamp for each_session in content_session_logs
        ),
        end_timestamp=max(
            each_session.end_timestamp for each_session in content_session_logs
        ),
        completion_timestamp=get_completion_timestamp(content_session_logs),
        time_spent=sum(
            each_session.time_spent for each_session in content_session_logs
        ),
        progress=min(
            sum(each_session.progress for each_session in content_session_logs), 1.0
        ),
    )


def generate_mastery_log(summary_log):

    return MasteryLog.objects.create(
        user=summary_log.user,
        summarylog=summary_log,
        mastery_criterion={"m": 5, "n": 5, "type": "m_of_n"},
        mastery_level=1 if summary_log.progress >= 1.0 else -1,
        start_timestamp=summary_log.start_timestamp,
        end_timestamp=summary_log.end_timestamp,
        completion_timestamp=summary_log.completion_timestamp,
        complete=summary_log.progress >= 1.0,
        time_spent=summary_log.time_spent,
    )


def generate_user_session_log(
    user, session_start_time, session_duration_min, time_guaranteed=False
):

    last_interaction_time = session_start_time + datetime.timedelta(
        seconds=session_duration_min * 60
    )

    if not time_guaranteed and random.randint(0, 1) == 1:
        last_interaction_time = session_start_time

    return UserSessionLog.objects.create(
        user=user,
        start_timestamp=session_start_time,
        last_interaction_timestamp=last_interaction_time,
    )


# flake8: noqa: C901
def generate_interactions(
    n_users,
    n_visitors,
    start_time_range,
    end_time_range,
    user_session_duration,
    affected_channels,
):

    # get or generate facility
    facility = get_or_generate_new_facility()

    #  get or generate channel/s whose resources will be interacted with by the users/visitors
    content_nodes = get_or_generate_resources(n_channels=affected_channels)

    # Generate content_sessions_logs for kolibri visitors (anonymous users)
    for _ in range(n_visitors):
        generate_visitor_content_session_logs(
            visitor_id=uuid.uuid4().hex,
            content_node=random.choice(content_nodes),
            content_session_startime=get_random_date_within_range(
                start=start_time_range, end=end_time_range
            ),
        )

    # get or generate facility users who will have interactions
    users = get_or_generate_facility_users(n_users=n_users, facility=facility)

    # Generate authenticated facility users and their relevant interactions/logs
    for user in users:

        random_content_node = random.choice(content_nodes)

        # generate user session in kolibri
        # as a result all the following interactions start_timestamp will be >= session start_timestamp
        kolibri_user_session = generate_user_session_log(
            user=user,
            session_start_time=get_random_date_within_range(
                start=start_time_range, end=end_time_range
            ),
            session_duration_min=user_session_duration,
        )

        # generate interactions if only there is an available session time for current usr
        if (
            kolibri_user_session.start_timestamp
            == kolibri_user_session.last_interaction_timestamp
        ):
            continue

        # generate random number of user interactions with specific resource/content
        user_content_session_logs = generate_user_content_session_logs(
            content_node=random_content_node,
            kolibri_user_session=kolibri_user_session,
            user_session_duration=user_session_duration,
            user=user,
        )

        # generate summary of user interactions for the above generated content logs
        user_content_summary_logs = generate_content_summary_log(
            user_content_session_logs
        )

        if random_content_node.kind == content_kinds.EXERCISE:

            mastery_log = generate_mastery_log(user_content_summary_logs)

            assessments = random.choice(
                random_content_node.assessmentmetadata.all()
            ).assessment_item_ids

            if assessments:
                # generate attemptlogs (will be multiple for each content session log) for that exercise
                generate_attempts_logs_for_exercise_sessions(
                    user=user,
                    contentsessionlogs=user_content_session_logs,
                    masterylog=mastery_log,
                    assessments=assessments,
                )

        # if completion is achieved then randomly decide to generate another content_session_logs with anotehr user session in kolibri
        # as users do often review resources after completion as well
        if user_content_summary_logs.completion_timestamp and random.randint(0, 1) == 1:
            second_user_session = generate_user_session_log(
                user=user,
                session_start_time=kolibri_user_session.last_interaction_timestamp
                + datetime.timedelta(
                    days=random.randint(1, 2), seconds=(1440 * random.random()) * 60
                ),
                session_duration_min=user_session_duration,
                time_guaranteed=True,
            )
            generate_user_content_session_logs(
                content_node=random_content_node,
                kolibri_user_session=second_user_session,
                user_session_duration=user_session_duration,
                user=user,
            )


class Command(BaseCommand):
    def add_arguments(self, parser):

        parser.add_argument(
            "--mode",
            type=str,
            choices=["fixtures", "default_db"],
            default="default_db",
            help="data destination after generation, dumped into fixtures and deleted, or saved in default db",
        )

        parser.add_argument("--fixtures_path", type=str, default=None)

        parser.add_argument("--seed", type=int, default=1, help="Random seed")

        parser.add_argument(
            "--users", type=int, default=20, help="number of authenticated users"
        )

        parser.add_argument(
            "--visitors", type=int, default=5, help="number of anonymous users"
        )

        parser.add_argument("--affected_channels", type=int, default=1)

        parser.add_argument(
            "--start_time",
            type=lambda d: datetime.datetime.strptime(d, "%Y,%m,%d"),
            default=None,
            help="minimum sessions start_timestamp (default = 2022,1,1)",
        )

        parser.add_argument(
            "--end_time",
            type=lambda d: datetime.datetime.strptime(d, "%Y,%m,%d"),
            default=None,
            help="maximum sessions start_timestamp (default = current time ) ",
        )

        parser.add_argument(
            "--session",
            type=int,
            default=15,
            choices=range(15, 120),
            help="user session duration in kolibri range (15 : 120) mins",
        )

        parser.add_argument(
            "--n_sessions",
            type=int,
            default=1,
            choices=range(1, 10),
            help="number of user sessions in kolibri",
        )

        parser.add_argument(
            "--n_resources",
            type=int,
            default=1,
            choices=range(1, 5),
            help="number of resources each user has interacted with",
        )

    def handle(self, *args, **options):
        mode = options["mode"]
        seed_n = options["seed"]
        fixtures_path = options["fixtures_path"]

        affected_channels = options["affected_channels"]
        n_users = options["users"]
        n_visitors = options["visitors"]
        start_time_range = options["start_time"]
        end_time_range = options["end_time"]
        user_session_duration = options["session"]

        # good to have also
        # n_sessions = options["n_sessions"]
        # n_resources = options["n_resources"]

        # Set the random seed so that all operations will be randomized predictably
        random.seed(seed_n)

        if mode == "fixtures":

            if not fixtures_path:
                raise ValueError(
                    "\n fixtures_path is missing : please provide a fixtures file path\n"
                )

            switch_to_memory()

            logger.info(
                "\n generating sessions/logs and interactions for {} authenticated users and {} visitors...\n".format(
                    n_users, n_visitors
                )
            )

            generate_interactions(
                n_users=n_users,
                n_visitors=n_visitors,
                start_time_range=start_time_range,
                end_time_range=end_time_range,
                user_session_duration=user_session_duration,
                affected_channels=affected_channels,
            )

            logger.info("\n creating fixtures... \n")

            # dumping after generation is done
            call_command(
                "dumpdata",
                KolibriLoggerConfig.label,
                indent=4,
                output=fixtures_path,
                interactive=False,
            )

        else:
            logger.info(
                "\n generating sessions/logs and interactions for {} users and {} visitors...\n".format(
                    n_users, n_visitors
                )
            )

            generate_interactions(
                n_users=n_users,
                n_visitors=n_visitors,
                start_time_range=start_time_range,
                end_time_range=end_time_range,
                user_session_duration=user_session_duration,
                affected_channels=affected_channels,
            )
        logger.info("\n done\n")
