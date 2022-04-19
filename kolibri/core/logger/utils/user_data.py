from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import datetime
import logging
import random

from django.db.models import Max
from django.db.models import Min
from django.db.models import Sum
from django.db.models.query import Q
from django.db.utils import IntegrityError
from django.utils import timezone
from le_utils.constants import content_kinds

from kolibri.core.auth.constants import demographics
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentNode
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog

logger = logging.getLogger(__name__)


QUIZ_ITEM_DELIMETER = ":"

#####################
# When modifying here, run these tests for sanity:
#   pytest kolibri/core/analytics/test/test_utils.py
#   pytest kolibri/core/logger/utils/user_data.py
#####################


def logger_info(message, verbosity=1):
    # Encapsulate logging in an exception handler to capture encoding errors:
    # Sadly, simply wrapping the printing code in an exception handler
    # doesn't work on Windows, see: https://github.com/learningequality/kolibri/issues/7077
    try:
        # MUST: Follow the verbosity mechanism of Django's management commands
        # https://docs.djangoproject.com/en/1.11/ref/django-admin/#cmdoption-verbosity
        # and only show when it's > 0.
        # print("====> verbosity %s" % verbosity)
        if verbosity > 0:
            # REF: [Python, Unicode, and the Windows console](https://stackoverflow.com/a/32176732/845481)
            print(message)
    except Exception:
        # TODO(cpauya): Don't just pass on everything, capture only specific ones.
        pass


def get_or_create_facilities(**options):
    n_facilities = options["n_facilities"]
    device_name = options.get("device_name", "")
    verbosity = options.get("verbosity", 1)

    n_on_device = Facility.objects.all().count()
    n_to_create = n_facilities - n_on_device
    if n_to_create > 0:
        logger_info(
            "Generating {n} facility object(s)".format(n=n_to_create),
            verbosity=verbosity,
        )
        for i in range(0, n_to_create):
            facility_name = "Facility{i}".format(i=i + 1)
            if device_name:
                # If specified, prepend the device name to the facility.
                facility_name = "{0} {1}".format(device_name, facility_name)
            facility, created = Facility.objects.get_or_create(name=facility_name)
            facility.dataset.location = device_name
            facility.dataset.save()
            if created:
                logger_info("==> CREATED FACILITY {f}".format(f=facility), verbosity)

    return Facility.objects.all()[0:n_facilities]


def get_or_create_classrooms(**options):
    n_classes = options["n_classes"]
    facility = options["facility"]
    n_on_device = Classroom.objects.filter(parent=facility).count()
    n_to_create = n_classes - n_on_device
    device_name = options.get("device_name", "")
    verbosity = options.get("verbosity", 1)

    if n_to_create > 0:
        logger_info(
            "Generating {n} classroom object(s) for facility: {name}".format(
                n=n_to_create, name=facility.name
            ),
            verbosity,
        )
        for i in range(0, n_to_create):
            class_name = "Class{i}{a}".format(i=i + 1, a=random.choice("ABCD"))
            if device_name:
                # Prepend the facility name to the class to easily identify the class during
                # P2P sync tests. The facility name already has the device_name prepended.
                class_name = "{0} {1}".format(facility, class_name)
            classroom, created = Classroom.objects.get_or_create(
                parent=facility, name=class_name
            )
            if created:
                logger_info("==> CREATED Class {c}".format(c=classroom), verbosity)
    return Classroom.objects.filter(parent=facility)[0:n_classes]


def get_or_create_classroom_users(**options):
    classroom = options["classroom"]
    n_users = options["n_users"]
    user_data = options["user_data"]
    facility = options["facility"]
    device_name = options.get("device_name", "")
    verbosity = options.get("verbosity", 1)

    # The headers in the user_data.csv file that we use to generate user Full Names
    # Note, we randomly pick from these to give deliberately varied (and sometimes idiosyncratic)
    # Full names - because we should never assume that users have names like us
    user_data_name_fields = ["GivenName", "MiddleInitial", "Surname"]

    n_in_classroom = (
        FacilityUser.objects.filter(memberships__collection=classroom)
        .distinct()
        .count()
    )

    # Only generate new users if there are fewer users than requested.
    current_year = datetime.datetime.now().year
    n_to_create = n_users - n_in_classroom
    if n_to_create > 0:
        logger_info(
            "Generating {n} user object(s) for class: {classroom} in facility: {facility}".format(
                n=n_to_create, classroom=classroom, facility=facility
            ),
            verbosity=verbosity,
        )
        for i in range(0, n_to_create):
            # Get the first base data that does not have a matching user already
            base_data = user_data[n_in_classroom + i]
            # Randomly create the name from 1 to 3 of the three user name fields
            name = " ".join(
                [
                    base_data[key]
                    for key in random.sample(
                        user_data_name_fields, random.randint(1, 3)
                    )
                    if base_data[key]
                ]
            )
            if device_name:
                # If specified, prepend the device name to the user.
                name = "{0} {1}".format(device_name, name)
            # calculate birth year
            birth_year = str(current_year - int(base_data["Age"]))
            # randomly assign gender
            gender = random.choice(demographics.choices)[0]
            try:
                user = FacilityUser.objects.create(
                    facility=facility,
                    full_name=name,
                    username=base_data["Username"],
                    gender=gender,
                    birth_year=birth_year,
                )
                # Set a dummy password so that if we want to login as this learner later, we can.
                user.set_password("password")
                user.save()
            except IntegrityError:
                user = FacilityUser.objects.get(
                    facility=facility, username=base_data["Username"]
                )

            # Add the user to the current classroom
            classroom.add_member(user)

    return FacilityUser.objects.filter(memberships__collection=classroom).distinct()[
        0:n_users
    ]


def add_channel_activity_for_user(**options):  # noqa: max-complexity=16
    n_content_items = options["n_content_items"]
    channel = options["channel"]
    user = options["user"]
    now = options["now"]
    verbosity = options.get("verbosity", 1)

    channel_id = channel.id
    default_channel_content = ContentNode.objects.exclude(
        kind=content_kinds.TOPIC
    ).filter(channel_id=channel_id)

    logger_info(
        "Generating {i} user interaction(s) for user: {user} for channel: {channel}".format(
            i=n_content_items, user=user, channel=channel.name
        ),
        verbosity=verbosity,
    )
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
            session_logs.append(
                ContentSessionLog(
                    user=user,
                    channel_id=channel_id,
                    content_id=random_node.content_id,
                    start_timestamp=now - datetime.timedelta(i + j, 0, duration),
                    end_timestamp=now - datetime.timedelta(i + j),
                    # How many seconds did they actually spend doing something?
                    time_spent=(duration - idle_time) * 60,
                    progress=random.random(),
                    kind=random_node.kind,
                )
            )

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
                "channel_id": channel_id,
                # Start timestamp is the earliest start timestamp of the session logs
                "start_timestamp": min(
                    session_logs, key=lambda x: x.start_timestamp
                ).start_timestamp,
                # End timestamp is the latest of all the end timestamps
                "end_timestamp": max(
                    session_logs, key=lambda x: x.end_timestamp
                ).end_timestamp,
                "completion_timestamp": completion_timestamp,
                "time_spent": sum(
                    session_log.time_spent for session_log in session_logs
                ),
                "progress": min(
                    sum(session_log.progress for session_log in session_logs), 1.0
                ),
            },
        )

        if not created:
            # We didn't create the summary log this time, so it probably means it has other session logs
            # Aggregate the information from there to update the relevant fields on the summary log
            updates = ContentSessionLog.objects.filter(
                user=user, kind=random_node.kind, content_id=random_node.content_id
            ).aggregate(
                start_timestamp=Min("start_timestamp"),
                end_timestamp=Max("end_timestamp"),
                progress=Sum("progress"),
            )

            summary_log.start_timestamp = updates["start_timestamp"]
            summary_log.end_timestamp = updates["end_timestamp"]
            if summary_log.progress < 1.0 and updates["progress"] >= 1.0:
                # If it was not previously completed, and is now, set the completion timestamp to the
                # final end timestamp of the session logs.
                summary_log.completion_timestamp = updates["end_timestamp"]
            summary_log.progress = min(1.0, updates["progress"])
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
                    "start_timestamp": summary_log.start_timestamp,
                    "end_timestamp": summary_log.end_timestamp,
                    "complete": summary_log.progress >= 1.0,
                    "completion_timestamp": completion_timestamp,
                    "mastery_criterion": {"m": 5, "n": 5, "type": "m_of_n"},
                },
            )

            if not created:
                # Not created, so update relevant fields on it based on new interactions
                if not mastery_log.complete and summary_log.progress >= 1.0:
                    mastery_log.complete = True
                    mastery_log.completion_timestamp = summary_log.completion_timestamp
                mastery_log.end_timestamp = summary_log.end_timestamp

            # Get the list of assessment item ids from the assessment meta data
            assessment_item_ids = (
                random_node.assessmentmetadata.first().assessment_item_ids
            )
            if not assessment_item_ids:
                continue
            for j, session_log in enumerate(reversed(session_logs)):
                # Always make students get 5 attempts correct in the most recent session
                # if the exercise is complete
                complete = j == 0 and mastery_log.complete
                if complete:
                    n = 5
                else:
                    # Otherwise, let them have answered between 1 and 5 questions per session
                    n = random.randint(1, 5)
                # How long did they spend on these n questions?
                timespan = session_log.end_timestamp - session_log.start_timestamp
                # Index through each individual question
                for k in range(0, n):
                    if complete:
                        # If this is the session where they completed the exercise, always
                        # make them get it right
                        correct = True
                    else:
                        # Otherwise only let students get odd indexed questions right,
                        # ensuring they will always have a mastery breaking sequence
                        # as zero based indexing means their first attempt will always be wrong!
                        correct = k % 2 == 1

                    start_timestamp = session_log.end_timestamp - (timespan / n) * (
                        k + 1
                    )

                    end_timestamp = session_log.end_timestamp - (timespan / n) * k

                    # If incorrect, must have made at least two attempts at the question
                    question_attempts = 1 if correct else random.randint(2, 5)

                    question_interval = (
                        end_timestamp - start_timestamp
                    ) / question_attempts

                    # If they got it wrong, give 20/80 chance that they took a hint to do so
                    hinted = random.choice((False, False, False, False, not correct))
                    if hinted:
                        first_interaction = {"correct": False, "type": "hint"}
                    else:
                        first_interaction = {"correct": correct, "type": "answer"}
                    first_interaction.update(
                        {"answer": {}, "timestamp": start_timestamp + question_interval}
                    )

                    interaction_history = [first_interaction]

                    # If it is correct, this can be our only response, otherwise, add more.
                    if not correct:
                        for att in range(1, question_attempts - 1):
                            # Add on additional attempts for intervening incorrect responses
                            interaction_history += [
                                {
                                    "correct": False,
                                    "type": "answer",
                                    "answer": {},
                                    "timestamp": start_timestamp
                                    + question_interval * (att + 1),
                                }
                            ]
                        # Finally, add a correct response that allows the user to move onto the next question
                        interaction_history += [
                            {
                                "correct": True,
                                "type": "answer",
                                "answer": {},
                                "timestamp": end_timestamp,
                            }
                        ]

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
                        simple_answer="",
                        interaction_history=interaction_history,
                        user=user,
                        masterylog=mastery_log,
                        sessionlog=session_log,
                    )


def create_lessons_for_classroom(**options):

    classroom = options["classroom"]
    channels = options["channels"]
    num_lessons = options["lessons"]
    facility = options["facility"]
    now = options["now"]

    if not channels:
        return

    coaches = facility.get_coaches()
    if coaches:
        coach = random.choice(coaches)
    else:
        members = facility.get_members()
        if not members:
            coach = FacilityUser.objects.create(username="coach", facility=facility)
            coach.set_password("password")
            coach.save()
        else:
            coach = random.choice(members)
            facility.add_coach(coach)

    for count in range(num_lessons):

        channel = random.choice(channels)
        channel_content = ContentNode.objects.filter(channel_id=channel.id)
        # don't add more than 10 resources per Lesson:
        n_content_items = min(random.randint(0, channel_content.count() - 1), 10)
        lesson_content = []
        for i in range(0, n_content_items):
            # Use this to randomly select a content node to generate the interaction for
            random_node = random.choice(channel_content)
            content = {
                "contentnode_id": random_node.id,
                "channel_id": channel.id,
                "content_id": random_node.content_id,
            }
            lesson_content.append(content)

        lesson = Lesson.objects.create(
            title="Lesson {}-{a}".format(count, a=random.choice("ABCDEF")),
            resources=lesson_content,
            is_active=True,
            collection=classroom,
            created_by=coach,
            date_created=now,
        )
        LessonAssignment.objects.create(
            lesson=lesson, collection=classroom, assigned_by=coach
        )


def create_exams_for_classrooms(**options):

    classroom = options["classroom"]
    channels = options["channels"]
    num_exams = options["exams"]
    facility = options["facility"]
    now = options["now"]
    device_name = options.get("device_name", "")

    if not channels:
        return

    coaches = facility.get_coaches()
    if coaches:
        coach = random.choice(coaches)
    else:
        members = facility.get_members()
        if not members:
            coach = FacilityUser.objects.create(username="coach", facility=facility)
            coach.set_password("password")
            if device_name:
                # If specified, prepend the device_name to the new coach.
                coach.name = "{0} {1}".format(device_name, coach.name)
            coach.save()
        else:
            coach = random.choice(members)
            facility.add_coach(coach)

    for count in range(num_exams):

        # exam questions can come from different channels
        exercise_content = ContentNode.objects.filter(
            kind=content_kinds.EXERCISE
        ).filter(~Q(assessmentmetadata__assessment_item_ids=[]))
        # don't add more than 3 resources per:
        n_content_items = min(exercise_content.count(), 3)
        exam_content = []
        content_ids = []
        assessment_ids = []
        for i in range(0, n_content_items):
            # Use this to randomly select an exercise content node to generate the interaction for
            random_node = random.choice(exercise_content)
            # grab this exercise node's assessment ids
            assessment_item_ids = (
                random_node.assessmentmetadata.first().assessment_item_ids
            )
            # randomly select one of the questions in the exercise and store the ids for the exam attempt logs
            assessment_ids.append(random.choice(assessment_item_ids))
            content = {
                "exercise_id": random_node.id,
                "question_id": assessment_ids[i],
                "title": random_node.title,
            }
            exam_content.append(content)
            # store content ids for when we generate exam attempt logs
            content_ids.append(random_node.content_id)

        exam = Exam.objects.create(
            title="Quiz {}-{a}".format(count, a=random.choice("ABCDEF")),
            question_count=n_content_items,
            question_sources=exam_content,
            active=True,
            collection=classroom,
            creator=coach,
            data_model_version=1,
        )
        ExamAssignment.objects.create(
            exam=exam, collection=classroom, assigned_by=coach
        )
        # everyone in the class has to take the exam
        for user in classroom.get_members():
            random_seconds = random.randint(1, 500)
            seconds = timezone.timedelta(seconds=random_seconds)
            then = now - seconds
            # create mastery log per user
            sessionlog = ContentSessionLog.objects.create(
                user=user,
                start_timestamp=then,
                end_timestamp=now,
                content_id=exam.id,
                channel_id=None,
                time_spent=60,  # 1 minute
                kind=content_kinds.QUIZ,
            )
            summarylog = ContentSummaryLog.objects.create(
                user=user,
                start_timestamp=then,
                end_timestamp=now,
                completion_timestamp=now,
                content_id=exam.id,
                channel_id=None,
                kind=content_kinds.QUIZ,
            )
            masterylog = MasteryLog.objects.create(
                mastery_criterion={"type": "quiz", "coach_assigned": True},
                summarylog=summarylog,
                start_timestamp=summarylog.start_timestamp,
                user=user,
                mastery_level=-1,
            )
            # create 1 exam attempt log per question in exam
            for i in range(len(exam_content)):
                correct = random.choice([0, 1])
                random_seconds = random.randint(1, 100)
                seconds = timezone.timedelta(seconds=random_seconds)
                AttemptLog.objects.create(
                    item="{}{}{}".format(
                        content_ids[i], QUIZ_ITEM_DELIMETER, assessment_ids[i]
                    ),
                    start_timestamp=now - seconds,
                    end_timestamp=now,
                    completion_timestamp=now,
                    time_spent=random_seconds,
                    complete=True,
                    correct=correct,
                    # hints not allowed for exams
                    hinted=False,
                    # We can't meaningfully generate fake answer data/interaction history for Perseus exercises
                    # (which are currently our only exercise type) - so don't bother.
                    answer={},
                    interaction_history={},
                    user=user,
                    masterylog=masterylog,
                    sessionlog=sessionlog,
                )


# TODO(cpauya): WIP
# def create_groups_for_classrooms(**options):
#     # Creates specified number of groups per class.
#
#     classroom = options["classroom"]
#     facility = options["facility"]
#     channels = options["channels"]
#     num_groups = options["num_groups"]
#     now = options["now"]
#     device_name = options.get("device_name", "")

#     coaches = facility.get_coaches()
#     if coaches:
#         coach = random.choice(coaches)
#     else:
#         members = facility.get_members()
#         if not members:
#             coach = FacilityUser.objects.create(username="coach", facility=facility)
#             coach.set_password("password")
#             if device_name:
#                 # If specified, prepend the device_name to the new coach.
#                 coach.name = "{0} {1}".format(device_name, coach.name)
#             coach.save()
#         else:
#             coach = random.choice(members)
#             facility.add_coach(coach)

#     # Create group and enroll learners.
#     from kolibri.core.auth.models import LearnerGroup

#     # Only create specified number of groups per classroom.
#     if num_groups:
#         groups = LearnerGroup.objects.all()
#         if num_groups < len(groups):
#             return

#         for group in groups:
#             logger_info("==> group {group}".format(group=group))
