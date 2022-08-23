import random

from django.apps import apps
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connections
from le_utils.constants import content_kinds
from le_utils.constants import format_presets
from le_utils.constants import languages
from le_utils.constants import mastery_criteria
from le_utils.constants.labels import learning_activities
from le_utils.constants.labels.levels import LEVELSLIST
from le_utils.constants.labels.needs import NEEDSLIST
from le_utils.constants.labels.subjects import SUBJECTSLIST

from kolibri.core.content.models import AssessmentMetaData
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentTag
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile


# we are using a set in case we accidentally tried deleting the same object twice
generated_objects = set()

tags_generated = []

IGNORED_KINDS = ["quiz", "zim"]

ALL_RESOURCES_KINDS = [
    kind.id
    for kind in content_kinds.KINDLIST
    if kind.id not in IGNORED_KINDS and kind.id != "topic"
]

RESOURCES_COUNT = len(ALL_RESOURCES_KINDS)
LICENSE_NAME = "testing license"
LICENSE_NAME_DESCRIPTION = (
    "ABC organization authorizes kolibri to use this these resources"
)
LICENSE_OWNER = "ABC org"
MIN_SCHEMA_VERSION = 1
DEVELOPER_NAME = "bedo khaled"


def switch_to_memory():
    print("\n initializing the testing environment in memory....\n")
    for db in settings.DATABASES:
        settings.DATABASES[db] = {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
        try:
            del connections[db]
        except AttributeError:
            pass
        call_command("migrate", interactive=False, database=db)


# get app/s models names that will be dumped
def get_app_models(*apps_names):
    models_names = []

    # first way, extracts only the base (main) models
    for app_name in apps_names:
        for model in list(apps.get_app_config(app_name).get_models()):
            models_names.append(f"{app_name}.{model.__name__}")

    return models_names

    # another way of getting app models (which gets more models but are in lowercase)

    # for app_name in apps_names:
    #     for model in dict(apps.all_models[app_name]):
    #         models_names.append(f"{app_name}.{model}")

    # which one should we use ? (i.e which models will be dumped ? the ones extraced through the first or the second way)


def generate_random_id():
    import uuid

    return uuid.uuid4().hex


# for returning random choices


def choices(sequence, k):
    return [random.choice(sequence) for _ in range(0, k)]


# puprpose: if we have a content node of certain kind what type of file (file_preset) should maps to this node  ?

content_kind_to_file_preset = {}

# format_presets.PRESETLIST to a dictionary for convenient access
format_prestets_data = {}

for format_object in format_presets.PRESETLIST:
    if format_object.kind:
        format_prestets_data[format_object.id] = format_object

        if format_object.kind not in content_kind_to_file_preset:
            content_kind_to_file_preset[format_object.kind] = [format_object.id]
        else:
            content_kind_to_file_preset[format_object.kind].append(format_object.id)


def generate_assessmentmetadata(node=None, randomize=False, is_manipulable=False):
    number_of_assessments = random.randint(1, 30)
    assessment_item_ids = [
        str(generate_random_id()) for _ in range(number_of_assessments)
    ]

    random_criteria = random.choice(mastery_criteria.MASTERYCRITERIALIST)

    mapper = {
        mastery_criteria.DO_ALL: {
            "type": random_criteria,
            "n": number_of_assessments,
            "m": number_of_assessments,
        },
        mastery_criteria.NUM_CORRECT_IN_A_ROW_10: {
            "type": random_criteria,
            "n": 10,
            "m": 10,
        },
        mastery_criteria.NUM_CORRECT_IN_A_ROW_2: {
            "type": random_criteria,
            "n": 2,
            "m": 2,
        },
        mastery_criteria.NUM_CORRECT_IN_A_ROW_3: {
            "type": random_criteria,
            "n": 3,
            "m": 3,
        },
        mastery_criteria.NUM_CORRECT_IN_A_ROW_5: {
            "type": random_criteria,
            "n": 5,
            "m": 5,
        },
        mastery_criteria.M_OF_N: {
            "type": random_criteria,
            "n": random.randint(5, 7),
            "m": random.randint(1, 3),
        },
    }

    meta_data = AssessmentMetaData.objects.create(
        id=generate_random_id(),
        contentnode=node,
        assessment_item_ids=assessment_item_ids,
        number_of_assessments=number_of_assessments,
        mastery_model=mapper[random_criteria],
        randomize=randomize,
        is_manipulable=is_manipulable,
    )
    generated_objects.add(meta_data)
    return meta_data


def generate_some_tags():

    # dummy tag names
    TAG_NAMES = [
        "Math",
        "science_related",
        "have_fun",
        "children",
        "experiment",
        "bedo_tag",
        "course",
        "culture",
        "introduction",
        "whatever",
        "another_tag",
        "nice tag",
    ]

    for tag_name in TAG_NAMES:

        tag = ContentTag.objects.create(tag_name=tag_name, id=generate_random_id())
        tags_generated.append(tag)
        generated_objects.add(tag)


def get_or_generate_language(lang_id):
    try:
        return Language.objects.get(id=lang_id)

    except Language.DoesNotExist:

        # fetched languages from le_utils/resources/languagelookup.json
        fetched_lang_data = languages.getlang(lang_id)

        if not fetched_lang_data:
            return None
        new_lang = Language.objects.create(
            id=lang_id,
            lang_code=fetched_lang_data.primary_code,
            lang_subcode=fetched_lang_data.subcode,
            lang_name=fetched_lang_data.native_name,
            lang_direction=languages.getlang_direction(lang_id),
        )

        generated_objects.add(new_lang)

        return new_lang


def generate_localfile(file_preset):

    # this was calculated by taking the average of file_size of localfiles of each extension in QA channel
    # so it has to be manully written here as this information doesn't exist, it was calculcated by me, why?
    # well instead of just generating random numbers i wanted the file_size values to be more relevant to their corresponding extension
    extension_to_file_size = {
        "mp4": 16293436.885714285,
        "webm": None,
        "vtt": 3227.507692307692,
        "pdf": 6655360.057142857,
        "epub": 13291472.210526315,
        "mp3": 2102685.625,
        "jpg": 20291943.133333333,
        "jpeg": 30457141.25,
        "png": 2833124.8260869565,
        "gif": None,
        "json": 3529.0,
        "svg": None,
        "graphie": None,
        "perseus": 357012.67441860464,
        "h5p": 10699889.2,
        "zim": None,
        "zip": 5285446.041666667,
    }

    extensions_choices = format_prestets_data[file_preset].allowed_formats

    extension_to_use = random.choice(extensions_choices)

    new_localfile = LocalFile.objects.create(
        id=generate_random_id(),
        extension=extension_to_use,
        available=True,
        file_size=extension_to_file_size[extension_to_use],
    )

    generated_objects.add(new_localfile)
    return new_localfile


def generate_file(contentnode):

    preset_options = content_kind_to_file_preset[contentnode.kind]

    file_preset = random.choice(preset_options)

    local_file = generate_localfile(file_preset)

    file = File.objects.create(
        id=generate_random_id(),
        local_file=local_file,
        contentnode=contentnode,
        lang=contentnode.lang,
        supplementary=format_prestets_data[file_preset].supplementary,
        thumbnail=format_prestets_data[file_preset].thumbnail,
        preset=file_preset,
    )

    return file


def generate_channel(name, root_node, channel_id):

    channel = ChannelMetadata.objects.create(
        id=channel_id,
        name=name,
        description="this is the testing channel {name}, generated for testing purposes",
        author=DEVELOPER_NAME,
        min_schema_version=MIN_SCHEMA_VERSION,
        root=root_node,
    )

    return channel


def generate_one_contentNode(
    kind=None,
    title="",
    description=None,
    channel_id=None,
    parent=None,
    available=True,
    is_root=False,
    lang_id="en",
    node_tags=[],
):

    kind_to_learninactivity = {
        "topic": "",
        "slideshow": "",
        "document": f"{learning_activities.READ},{learning_activities.REFLECT}",
        "video": f"{learning_activities.WATCH},{learning_activities.REFLECT}",
        "html5": f"{learning_activities.EXPLORE},{learning_activities.REFLECT}",
        "audio": f"{learning_activities.LISTEN},{learning_activities.REFLECT}",
        "exercise": f"{learning_activities.PRACTICE},{learning_activities.REFLECT}",
        "h5p": f"{learning_activities.EXPLORE}.{learning_activities.REFLECT}",
    }

    new_node = ContentNode.objects.create(
        id=generate_random_id(),
        parent=None if is_root else parent,
        channel_id=channel_id,
        content_id=generate_random_id(),
        kind=kind,
        title=title,
        lang=get_or_generate_language(lang_id),
        license_name=LICENSE_NAME,
        license_description=LICENSE_NAME_DESCRIPTION,
        description=description,
        license_owner=LICENSE_OWNER,
        author=DEVELOPER_NAME,
        available=available,
        learning_activities=kind_to_learninactivity[kind],
        categories=",".join(set(choices(SUBJECTSLIST, k=random.randint(1, 10)))),
        learner_needs=",".join(set(choices(NEEDSLIST, k=random.randint(1, 5)))),
        grade_levels=",".join(set(choices(LEVELSLIST, k=random.randint(1, 2)))),
    )

    if node_tags:
        new_node.tags.add(*node_tags)
        new_node.save()

    # generate related File object for this node
    generate_file(new_node)

    # generate assessment metada for this contentnode if its kind is exercise, correct or no?
    if kind == content_kinds.EXERCISE:
        generate_assessmentmetadata(node=new_node)

    return new_node


def generate_topic(
    title="", channel_id=None, parent=None, is_root=False, description=""
):
    return generate_one_contentNode(
        kind=content_kinds.TOPIC,
        title=title,
        channel_id=channel_id,
        parent=parent,
        is_root=is_root,
        description=description,
    )


def generate_leaf(
    title="random leaf node",
    resource_kind=None,
    channel_id=None,
    parent=None,
    description="",
):
    return generate_one_contentNode(
        kind=resource_kind,
        title=title,
        channel_id=channel_id,
        parent=parent,
        description=description,
        node_tags=random.sample(tags_generated, random.randint(1, 5)),
    )


def recurse_and_generate(
    parent,
    channel_id,
    levels,
    kind_iterator,
    num_children=RESOURCES_COUNT,
):
    children = []
    for i in range(num_children):
        current_resource_kind = ALL_RESOURCES_KINDS[kind_iterator % RESOURCES_COUNT]
        if levels == 0:
            current_node = generate_leaf(
                title=f"{current_resource_kind}_{i+1}",
                resource_kind=current_resource_kind,
                channel_id=channel_id,
                parent=parent,
            )

        else:
            topic_title = f"level {levels}, topic_{i+1}"
            # last parent nodes (parent of the actual resources)
            if levels == 1:
                topic_title = f"level {levels}, {current_resource_kind}_resources"

            current_node = generate_topic(
                title=topic_title,
                channel_id=channel_id,
                parent=parent,
                description="",
            )

            current_node.children.add(
                *recurse_and_generate(
                    parent=current_node,
                    channel_id=channel_id,
                    levels=levels - 1,
                    kind_iterator=kind_iterator,
                )
            )

        children.append(current_node)

    kind_iterator += 1
    return children


def generate_channels(n_channels, levels):
    generated_channels = []

    print("\n generating channel/s and its related data...\n")

    generate_some_tags()

    for c in range(n_channels):
        kind_iterator = 0

        channel_id = generate_random_id()

        root_node = generate_topic(
            title="root node (main folder)",
            is_root=True,
            channel_id=channel_id,
            description="first and main contentnode in this testing tree",
        )

        channel = generate_channel(
            name=f"Testing channel _{c+1} of {levels} levels",
            root_node=root_node,
            channel_id=channel_id,
        )

        # generating tree nodes starting from the root node
        root_node.children.add(
            *recurse_and_generate(
                parent=root_node,
                channel_id=channel_id,
                levels=levels,
                kind_iterator=kind_iterator,
            )
        )

        channel_contents = ContentNode.objects.filter(
            channel_id=channel_id,
        ).exclude(kind=content_kinds.TOPIC)

        channel.total_resource_count = channel_contents.count()

        for each_content in channel_contents:
            if each_content.lang:
                channel.included_languages.add(each_content.lang)

        generated_channels.append(channel)

    return generated_channels


class Command(BaseCommand):

    help = "generate fixtures/data for the specified app"

    def add_arguments(self, parser):

        parser.add_argument(
            "--mode",
            type=str,
            choices=["fixtures", "default_db"],
            default="fixtures",
            help="where should the data be after generation? dumped into fixtures and deleted or saved in default db",
        )

        parser.add_argument(
            "--n_channels",
            type=int,
            choices=range(1, 10),
            default=1,
            help="number of tree levels",
        )

        parser.add_argument(
            "--levels",
            type=int,
            choices=range(1, 10),
            default=2,
            help="number of tree levels",
        )

    def handle(self, *args, **options):
        generating_mode = options["mode"]
        n_channels = options["n_channels"]
        required_levels = options["levels"]

        if generating_mode == "fixtures":

            # takes much time for switching, alternatives ??
            switch_to_memory()

            channels_generated = generate_channels(
                n_channels=n_channels, levels=required_levels
            )

            # dumping after generation is done
            print("\n start dumping fixtures for content app \n")

            call_command(
                "dumpdata",
                *get_app_models("content"),
                indent=4,
                # for json file creation to work correctly your pwd (in terminal) have to be ../kolibri/core/content
                # we want to fix that (i.e. creating the file correctly regardless of our current terminal path), how ?
                output="fixtures/all_content_data.json",
                interactive=False,
            )

            # although we are in memory (data will be cleared by default) but just in case we didn't switch to memory
            [
                each_channel.delete_content_tree_and_files()
                for each_channel in channels_generated
            ]

            [
                each_generated_object.delete()
                for each_generated_object in generated_objects
            ]

        else:
            generate_channels(n_channels=n_channels, levels=required_levels)
