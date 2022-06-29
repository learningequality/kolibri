import csv
from django.conf import settings
from django.db import connections
from django.core.management import call_command


from kolibri.core.content.apps import KolibriContentConfig
from kolibri.core.content.models import *

from le_utils.constants import content_kinds
from le_utils.constants import format_presets

content_kinds = content_kinds.choices
format_presets = format_presets.choices
current_app_name = KolibriContentConfig.label


content_kind_to_file_preset = {
    "topic": "topic_thumbnail",
    "video" : ["video_subtitle","video_thumbnail","low_res_video","high_res_video"],
    "audio": ["audio","audio_thumbnail"],
    "exercise": ["exercise","exercise_thumbnail"],
    "document": ["document","document_thumbnail"],
    "html5": ["html5_zip","html5_thumbnail"],
    "slideshow":["slideshow_manifest","slideshow_image"],
    "h5p" : ["h5p","audio_thumbnail"],
}
 


def ToMemory():
    for db in settings.DATABASES:
        db = str(db)
        settings.DATABASES[db] = {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
        try :
            del connections[db]
        except AttributeError:
            pass 
        call_command("migrate", interactive=False, database=db)


#ToMemory()

def generate_content_id():    
    import uuid
    created_id = uuid.uuid4().hex 

    with open("content_ids.txt", "a") as file:
        file.write("\n")
        file.write(created_id)
    return created_id


def generate_random_id():
    import uuid
    return uuid.uuid4().hex 



Languages_Dict = {}

# any generated object will be added here to get deleted later after dumping
generated_objects = set()

def get_Lang(lang_id):
    try:
        return Languages_Dict[lang_id]
    except KeyError:
        with open('languages.csv') as file:
            csv_file = csv.reader(file)
            for row in csv_file:
                if row[0] == lang_id:
                    new_lang = Language.objects.create(
                            id=lang_id,
                            lang_code=row[1],
                            lang_subcode=row[2],
                            lang_name=row[3],
                            lang_direction=row[4])
                    Languages_Dict[lang_id] = new_lang
                    generated_objects.add(new_lang)
                    return new_lang
    
      
#some constants : 

channel_id = generate_random_id()

generated_models = ["content.ContentNode","content.ChannelMetadata","content.Language"]


json_file_name = "content_nodes"
license_name = "testing license"
license_description = "ABC organization authorizes kolibri to use this these resources"
license_owner="ABC org"
developer = "bedo khaled"


def GenerateTags(no_tags=30):
    for i in range(no_tags):
        tag=ContentTag.objects.create(tag_name=f"Tag_{i}", id=generate_random_id())
        generated_objects.add(tag)
    generated_models.append("content.ContentTag")


def GenerateChannel(id,root_node):
    channel= ChannelMetadata.objects.create(
        id = id,
        name =  "main testing channel",
        author=developer,
        min_schema_version= "1",
        root=root_node)

    generated_objects.add(channel)
    return channel 



def CreateContentNode(channel_id,kind,title,description=None,parent=None,available=True,lang=get_Lang("en")):
    
    new_node = ContentNode.objects.create(
    
    id = generate_content_id(),
    parent = parent,
    channel_id = channel_id,
    content_id = generate_random_id(),
    kind=kind,
    lang=lang,

    license_name=license_name,
    license_description=license_description,
    title=title ,
    description=description,
    license_owner=license_owner,
    author=developer,
    available=available)

    generated_objects.add(new_node)

    return new_node



root_node=CreateContentNode(
    channel_id,
    "topic",
    "computer science channel",
    "first root_node created solely for testing with a title of compuer science")



computer_science_channel = GenerateChannel(channel_id,root_node)



call_command("dumpdata",*generated_models,indent=4, output=f"fixtures/{json_file_name}.json",interactive=False)



#deleting after dumping 
for generated_object in generated_objects:
    generated_object.delete()

