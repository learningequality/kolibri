import csv
import datetime
import logging
import os
import random
import uuid

from django.core.management import call_command
from django.core.management.base import BaseCommand
from le_utils.constants import content_kinds

from kolibri.core.auth.constants import demographics
from kolibri.core.auth.constants import facility_presets
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.content.management.commands.generate_content_data import (
    generate_channels,
)
from kolibri.core.content.management.commands.generate_content_data import (
    switch_to_memory,
)
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.utils.csv import open_csv_for_reading
from kolibri.utils.time_utils import local_now

logger = logging.getLogger(__name__)


def read_user_data_file(file_path):

    if not file_path:
        file_path = os.path.abspath(
            os.path.join(
                os.path.dirname(__file__),
                "..",
                "..",
                "..",
                "logger",
                "management",
                "commands",
                "user_data.csv",
            )
        )

    file_reader = open_csv_for_reading(file_path)
    return [data for data in csv.DictReader(file_reader)]


def generator():
    for i in range(500):
        yield i
        i += 1


users_data_iterator = generator()


def generate_facility_user(facility, all_users_base_data):
    def get_birth_year(user_age):
        current_year = datetime.datetime.now().year
        return str(current_year - int(user_age))

    i = next(users_data_iterator)
    user_data = all_users_base_data[i]

    user = FacilityUser(
        username=user_data["Username"],
        full_name=user_data["GivenName"] + " " + user_data["Surname"],
        birth_year=get_birth_year(user_data["Age"]),
        gender=random.choice(demographics.choices)[0],
        id_number=str(i),
        facility=facility,
    )
    # dummy password
    user.set_password("password")
    user.save()
    return user


# the following function doesn't work, it generates nothing (not throwing errors though)
# and when called it stops the execution of the script! don't know why
def generate_superadmin(all_users_base_data):
    i = next(users_data_iterator)
    user_data = all_users_base_data[i]

    username = user_data["Username"] + "_superuser"
    full_name = "{} is the device superuser".format(username)
    FacilityUser.objects.create_superuser(
        username,
        "password",
        full_name=full_name,
    )


def generate_facility_dataset(facility_name, device_name):

    preset_to_use = random.choice(facility_presets.choices)[0]
    facility_settings = facility_presets.mappings[preset_to_use]

    dataset = FacilityDataset(
        description="{} DataSet".format(facility_name),
        location=device_name,
        preset=preset_to_use,
        registered=random.choice([True, False]),
    )
    for attribute, value in facility_settings.items():
        setattr(dataset, attribute, value)

    dataset.save()
    return dataset


def generate_facility(facility_name, device_name):

    new_facility = Facility.objects.create(
        name=facility_name,
        dataset=generate_facility_dataset(facility_name, device_name),
    )
    return new_facility


def generate_classroom(name, parent_facility):
    classroom = Classroom.objects.create(name=name, parent=parent_facility)
    return classroom


def generate_group(name, parent_classroom):
    group = LearnerGroup.objects.create(name=name, parent=parent_classroom)
    return group


def generate_adhoc_group(name, parent_classroom, learners):
    adhoc_group = AdHocGroup.objects.create(name=name, parent=parent_classroom)
    # assign learners to adhoc-group (lesson or exam)
    adhoc_group.add_learners(learners)
    return adhoc_group


def generate_lesson(title, description, collection, creator):

    lesson = Lesson.objects.create(
        title=title,
        description=description,
        is_active=random.choice([True, False]),
        resources=get_or_generate_lesson_resources(),
        collection=collection,
        created_by=creator,
    )
    return lesson


def generate_lesson_assignment(lesson, collection, assigner_user):

    lesson_assignment = LessonAssignment.objects.create(
        lesson=lesson, collection=collection, assigned_by=assigner_user
    )
    return lesson_assignment


def generate_exam(title, collection, creator):
    data_model_version = random.randint(0, 2)
    q_sources = get_question_sources(data_model_version)
    is_active = random.choice([True, False])

    exam = Exam.objects.create(
        title=title,
        active=is_active,
        question_sources=q_sources,
        question_count=len(q_sources),
        learners_see_fixed_order=random.choice([True, False]),
        collection=collection,
        creator=creator,
        date_activated=local_now() if is_active else None,
        data_model_version=data_model_version,
    )
    return exam


def generate_exam_assignment(exam, collection, assigner_user):
    exam_assignment = ExamAssignment.objects.create(
        exam=exam, collection=collection, assigned_by=assigner_user
    )
    return exam_assignment


# resources (non-topic ContentNodes) for each lesson
def get_or_generate_lesson_resources():

    lesson_resources = []

    channels = ChannelMetadata.objects.all()

    # generate new channel/s if there are no local channels
    if not channels:
        channels = generate_channels(n_channels=1, levels=2, n_children=3)

    channel = random.choice(channels)

    channel_resources = ContentNode.objects.filter(channel_id=channel.id).exclude(
        kind=content_kinds.TOPIC
    )

    channel_resources = random.sample(
        list(channel_resources),
        min(random.randint(1, channel_resources.count() - 1), 10),
    )

    for contentnode in channel_resources:
        lesson_resources.append(
            {
                "contentnode_id": contentnode.id,
                "channel_id": channel.id,
                "content_id": contentnode.content_id,
            }
        )

    return lesson_resources


# resources (random ids) for each exam
def get_question_sources(v):
    def get_json_data(v, q):

        # model_version_to_question_sources_mapper
        mapper = {
            0: {
                "exercise_id": uuid.uuid4().hex,
                "number_of_questions": 6,
                "title": "question_{}".format(q + 1),
            },
            1: {
                "exercise_id": uuid.uuid4().hex,
                "question_id": uuid.uuid4().hex,
                "title": "question_{}".format(q + 1),
            },
            2: {
                "exercise_id": uuid.uuid4().hex,
                "question_id": uuid.uuid4().hex,
                "title": "question_{}".format(q + 1),
                "counter_in_exercise": "",
            },
        }

        return mapper[v]

    return [get_json_data(v, q) for q in range(random.randint(3, 10))]


# flake8: noqa: C901
def start_generating(
    n_facilities,
    n_facility_admins,
    n_facility_coaches,
    n_not_assigned_users,
    n_classes,
    n_class_coaches,
    n_class_learners,
    n_groups,
    n_group_learners,
    n_class_lessons,
    n_classs_exams,
    n_adhoc_lessons,
    n_adhoc_lesson_learners,
    n_adhoc_exams,
    n_adhoc_exam_learners,
    file_path,
):

    facilities = []

    all_users_base_data = read_user_data_file(file_path)

    for f in range(n_facilities):
        new_facility = generate_facility(
            facility_name="Facility_{}".format(f + 1), device_name="testing device"
        )

        # authorized users in the facility
        facility_coaches_and_admins = []

        # generating admin/s for the whole facility
        for _ in range(n_facility_admins):
            new_admin = generate_facility_user(new_facility, all_users_base_data)
            new_facility.add_admin(new_admin)
            facility_coaches_and_admins.append(new_admin)

        # generating coach/s for the whole facility
        for _ in range(n_facility_coaches):
            facility_coach = generate_facility_user(new_facility, all_users_base_data)
            new_facility.add_coach(facility_coach)
            facility_coaches_and_admins.append(facility_coach)

        # generating class/s
        for c in range(n_classes):
            class_name = "class_{}".format(c + 1) + random.choice("ABCDEF")
            new_class = generate_classroom(class_name, new_facility)

            # generate and assign assignable_coache/s to the class
            for _ in range(n_class_coaches):
                assignable_coach = generate_facility_user(
                    new_facility, all_users_base_data
                )
                # ASSIGNABLE_COACH with respect to the facility
                new_facility.add_role(assignable_coach, role_kinds.ASSIGNABLE_COACH)
                # COACH with respect to the class
                new_class.add_coach(assignable_coach)

            # generate and assign learner/s to the class
            all_class_learners = []
            for _ in range(n_class_learners):
                class_learner = generate_facility_user(
                    new_facility, all_users_base_data
                )
                all_class_learners.append(class_learner)
                new_class.add_member(class_learner)

            # 'facility_coaches_and_admins' is constant for all facility classes
            #  but for each new_class coaches/admins are differnt that's why we construct this for every class
            creators_and_assigners_users = [
                *new_class.get_coaches(),
                *new_class.get_admins(),
            ]

            [
                creators_and_assigners_users.append(authorized_facility_user)
                for authorized_facility_user in facility_coaches_and_admins
            ]

            # generating learner_group/s for the above class
            for g in range(n_groups):
                learner_group = generate_group(
                    name="learner_group_{}".format(g), parent_classroom=new_class
                )
                # randomly assign class learners to each learner_group
                for class_learner in random.sample(
                    all_class_learners, n_group_learners
                ):
                    learner_group.add_learner(class_learner)

            # generate and assign lesson/s to the whole class
            for l in range(n_class_lessons):
                lesson = generate_lesson(
                    title="Lesson_{}".format(l + 1),
                    description="Lesson_{} for {}".format(l + 1, class_name),
                    collection=new_class,
                    creator=random.choice(creators_and_assigners_users),
                )

                generate_lesson_assignment(
                    lesson=lesson,
                    collection=new_class,
                    assigner_user=random.choice(creators_and_assigners_users),
                )

            # generate and assign exam/s to the class
            for e in range(n_classs_exams):
                exam = generate_exam(
                    title="exam_{} for the whole {}".format(e + 1, class_name),
                    collection=new_class,
                    creator=random.choice(creators_and_assigners_users),
                )

                generate_exam_assignment(
                    exam=exam,
                    collection=new_class,
                    assigner_user=random.choice(creators_and_assigners_users),
                )

            # generate lesson/s for specific learners
            for l in range(n_adhoc_lessons):
                lesson = generate_lesson(
                    title="Lesson_{}".format(l + 1),
                    description="Lesson_{} for {}".format(l + 1, class_name),
                    collection=new_class,
                    creator=random.choice(creators_and_assigners_users),
                )
                generate_lesson_assignment(
                    lesson=lesson,
                    collection=generate_adhoc_group(
                        name="adhoc_{} in {}".format(lesson.title, class_name),
                        parent_classroom=new_class,
                        learners=random.sample(
                            all_class_learners, n_adhoc_lesson_learners
                        ),
                    ),
                    assigner_user=random.choice(creators_and_assigners_users),
                )

            # generate exam/s for specific learners
            for e in range(n_adhoc_exams):

                exam = generate_exam(
                    title="exam_{} for specific learners".format(e + 1),
                    collection=new_class,
                    creator=random.choice(creators_and_assigners_users),
                )

                generate_exam_assignment(
                    exam=exam,
                    collection=generate_adhoc_group(
                        name="adhoc_{} in {}".format(exam.title, class_name),
                        parent_classroom=new_class,
                        learners=random.sample(
                            all_class_learners, n_adhoc_exam_learners
                        ),
                    ),
                    assigner_user=random.choice(creators_and_assigners_users),
                )

        # generating left users (not assigned to any collection, just the facility)
        for _ in range(n_not_assigned_users):
            generate_facility_user(new_facility, all_users_base_data)

        facilities.append(new_facility)

    return facilities


class Command(BaseCommand):
    def add_arguments(self, parser):

        parser.add_argument(
            "--mode",
            type=str,
            choices=["fixtures", "default_db"],
            default="default_db",
            help="data destination after generation, dumped into fixtures and deleted, or saved in default db",
        )

        parser.add_argument(
            "--fixtures_path",
            type=str,
        )

        parser.add_argument(
            "--file_path",
            type=str,
            default="",
            help="path to the csv file which containts users base data",
        )

        parser.add_argument(
            "--facilities",
            type=int,
            choices=range(1, 10),
            default=1,
            help="number of facilities to generate",
        )

        parser.add_argument(
            "--not_assigned_users",
            type=int,
            choices=range(5, 20),
            default=5,
            help="number of facility users that aren't assigned to any collection",
        )

        parser.add_argument(
            "--admins",
            type=int,
            choices=range(1, 5),
            default=1,
            help="number of facility admins",
        )

        parser.add_argument(
            "--coaches",
            type=int,
            choices=range(1, 10),
            default=1,
            help="number of facility coaches",
        )

        parser.add_argument(
            "--classes",
            type=int,
            choices=range(1, 30),
            default=2,
            help="number of classes to generate",
        )

        parser.add_argument(
            "--class_coaches",
            type=int,
            choices=range(1, 5),
            default=1,
            help="number of assigned coaches per class ",
        )

        parser.add_argument(
            "--class_learners",
            type=int,
            choices=range(1, 100),
            default=20,
            help="number of learners  per class ",
        )

        parser.add_argument(
            "--class_lessons",
            type=int,
            choices=range(5, 20),
            default=5,
            help="total number of lessons per class",
        )

        parser.add_argument(
            "--class_exams",
            type=int,
            choices=range(1, 20),
            default=0,
            help="total number of lessons per class",
        )

        parser.add_argument(
            "--groups",
            type=int,
            choices=range(1, 20),
            default=0,
            help="number of learnergroups to generate per class",
        )

        parser.add_argument(
            "--group_members",
            type=int,
            choices=range(1, 20),
            default=5,
            help="number of group learners ",
        )

        parser.add_argument(
            "--adhoc_lessons",
            type=int,
            choices=range(1, 20),
            default=0,
            help="number of lessons assigned for specific learners",
        )

        parser.add_argument(
            "--adhoc_lesson_learners",
            type=int,
            choices=range(1, 20),
            default=5,
            help="number of learners for the adhoc_lesson",
        )

        parser.add_argument(
            "--adhoc_exams",
            type=int,
            choices=range(1, 20),
            default=0,
            help="number of exams assigned for specific learners",
        )

        parser.add_argument(
            "--adhoc_exam_learners",
            type=int,
            choices=range(1, 20),
            default=5,
            help="number of learners for the adhoc_exam",
        )

    def handle(self, *args, **options):

        # Generated Data destination
        mode = options["mode"]

        # Fixtures File destination
        fixtures_path = options["fixtures_path"]

        # users_base_data file path
        file_path = options["file_path"]

        # Facilities
        n_facilities = options["facilities"]
        n_facility_admins = options["admins"]
        n_facility_coaches = options["coaches"]
        n_not_assigned_users = options["not_assigned_users"]

        # Classrooms
        n_classes = options["classes"]
        n_class_coaches = options["class_coaches"]
        n_class_learners = options["class_learners"]
        n_classs_exams = options["class_exams"]
        n_class_lessons = options["class_lessons"]

        # Groups
        n_groups = options["groups"]
        n_group_learners = options["group_members"]

        # AdHocGroups (for assigning lessons/exams to specific learners)
        n_adhoc_lessons = options["adhoc_lessons"]
        n_adhoc_lesson_learners = options["adhoc_lesson_learners"]
        n_adhoc_exams = options["adhoc_exams"]
        n_adhoc_exam_learners = options["adhoc_exam_learners"]

        logger.info("\n start generating facility/s...\n")

        if mode == "fixtures":

            if not fixtures_path:
                raise ValueError(
                    "\n--fixtures_path is missing : please provide a fixtures file path"
                )
            switch_to_memory()

            facilities = start_generating(
                n_facilities=n_facilities,
                n_facility_admins=n_facility_admins,
                n_facility_coaches=n_facility_coaches,
                n_not_assigned_users=n_not_assigned_users,
                n_classes=n_classes,
                n_class_coaches=n_class_coaches,
                n_class_learners=n_class_learners,
                n_groups=n_groups,
                n_group_learners=n_group_learners,
                n_class_lessons=n_class_lessons,
                n_classs_exams=n_classs_exams,
                n_adhoc_lessons=n_adhoc_lessons,
                n_adhoc_lesson_learners=n_adhoc_lesson_learners,
                n_adhoc_exams=n_adhoc_exams,
                n_adhoc_exam_learners=n_adhoc_exam_learners,
                file_path=file_path,
            )

            logger.info("\n dumping and creating fixtures for generated channels... \n")

            # dumping after generation is done
            call_command(
                "dumpdata",
                "kolibriauth",
                "lessons",
                "exams",
                indent=4,
                output=fixtures_path,
                interactive=False,
            )

            # although we are in memory (data will be cleared by default) but just in case we didn't switch to memory
            [facility.delete() for facility in facilities]

        else:
            start_generating(
                n_facilities=n_facilities,
                n_facility_admins=n_facility_admins,
                n_facility_coaches=n_facility_coaches,
                n_not_assigned_users=n_not_assigned_users,
                n_classes=n_classes,
                n_class_coaches=n_class_coaches,
                n_class_learners=n_class_learners,
                n_groups=n_groups,
                n_group_learners=n_group_learners,
                n_class_lessons=n_class_lessons,
                n_classs_exams=n_classs_exams,
                n_adhoc_lessons=n_adhoc_lessons,
                n_adhoc_lesson_learners=n_adhoc_lesson_learners,
                n_adhoc_exams=n_adhoc_exams,
                n_adhoc_exam_learners=n_adhoc_exam_learners,
                file_path=file_path,
            )
        logger.info("\n done\n")
