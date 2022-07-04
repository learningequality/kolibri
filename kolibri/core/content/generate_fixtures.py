import csv
import random

from django.conf import settings
from django.apps import apps
from django.db import connections
from django.core.management import call_command

from kolibri.core.content.apps import KolibriContentConfig
from kolibri.core.content.models import *
from le_utils.constants import content_kinds
from le_utils.constants import format_presets

content_kinds_choices = content_kinds.choices
format_presets_choices = format_presets.choices

# names of all apps in interest, why?
apps_names = ["content","lessons","exams", "logger"]
# because later i want to make this script more flexible to be able to generate fixtures for any app
# I can imagine for example that the app name is provided as an argument when we run this script from the terminal 
# note : apps_names is not used yet

current_app_name = KolibriContentConfig.label


# get current app models names (content app in this case) that will be dumped
def GetAppModels(app_name):

   # first way, extracts only the base (main) models
    models_names = [f"{app_name}.{model.__name__}" for model in list(apps.get_app_config(app_name).get_models())]
   
   # second way, extracts all app models even if it doesn't explicilty inherit from models.Model (e.g. in content app : contentnode_has_prerequisite, contentnode_has_prerequisite,etc..)
    all_models_names = [f"{app_name}.{model}" for model in dict(apps.all_models[app_name])]

   # which one should we use ? (i.e which models will be dumped ? the ones extraced through the first or the second way)
    
    return models_names


# populating the current app models 

app_models = GetAppModels(current_app_name)



def generate_random_id():
    import uuid
    return uuid.uuid4().hex 





content_kind_to_file_preset = {
    "topic": ["topic_thumbnail"],
    "video" : ["video_subtitle","video_thumbnail","low_res_video","high_res_video"],
    "audio": ["audio","audio_thumbnail"],
    "exercise": ["exercise","exercise_thumbnail","qti"],
    "document": ["document","document_thumbnail"],
    "html5": ["html5_zip","html5_thumbnail"],
    "slideshow":["slideshow_manifest","slideshow_image"],
    "h5p" : ["h5p","audio_thumbnail"],
}



# code used to generate the following file_preset_to_localfile_extension mapper :
#     mapper = {}       
#     for form in format_presets:
#         mapper[form[0]] = LocalFile.objects.filter(id__in=[file.local_file.id for file in File.objects.filter(preset=form[0])])[0].extension

file_preset_to_localfile_extension={
    "high_res_video":"mp4",
    "low_res_video":"mp4",
    "video_thumbnail":"png",
    "audio_thumbnail":"png",
    "exercise_thumbnail":"png",
    "topic_thumbnail":"png",
    "html5_thumbnail":"png",
    "document_thumbnail":"jpg",
    "slideshow_image":"jpg",
    "html5_zip":"zip",
    "qti":"zip",
    "video_subtitle":"vtt",
    "audio":"mp3",
    "document":"pdf",
    "epub":"epub",
    "exercise":"perseus",
    "h5p":"h5p",
    "slideshow_manifest":"json",
}
 


# any generated object will be added here to get deleted later after dumping
generated_objects = set()



# keeps track of used (previously generated) languages (the ones that will be dumped) 
Used_Languages = {}

# same as above but for local files
Used_Local_Files = {}



# extracted languages from the QA channel
AllLanguages = {}
#run before switching to memory
def GetAllLanguages():
    all_langs= Language.objects.all()
    for lang in all_langs:
        AllLanguages[lang.id] =lang


# extracted localfiles from the QA channel
AllLocalFiles={}
#run before switching to memory
def GetAllLocalFiles():
    # available extensions for now : 
    exts = ["mp4","png","jpg","zip","mp3","vtt","json","epub","h5p","perseus","pdf"]
    
    for ext in exts:
        current_extension_files = LocalFile.objects.filter(extension=ext)
        AllLocalFiles[ext] = [file for file in current_extension_files]
    


def get_Lang(lang_id):
    try:
        return Used_Languages[lang_id]
    except KeyError:
        new_lang  = AllLanguages[lang.id]
        lang = Language.objects.create(
            id = lang_id,
            lang_code = new_lang.lang_code,
            lang_subcode = new_lang.lang_subcode,
            lang_name = new_lang.lang_name,
            lang_direction = new_lang.lang_direction)
        
        Used_Languages[lang_id] = lang
        generated_objects.add(lang)
        return lang
      

# since many File objects can map onto a single local file, so here we get previous (used) generated localfile
def get_used_localfile(id):
    return Used_Local_Files(id) 

# some constants : 
tag_names = ["Math.CC.K.CC.C.7","science_related","have_fun","children","experiment","bedo_tag","course","culture","introduction","whatever","another_tag"]
fixtures_file_path = "fixtures/bedo_fixtures.json"
license_name = "testing license"
license_description = "ABC organization authorizes kolibri to use this these resources"
license_owner="ABC org"
developer = "bedo khaled"



def GenerateChannel(root_node):
    
    channel= ChannelMetadata.objects.create(

        id = generate_random_id(),
        name =  "main testing channel",
        author = developer,
        min_schema_version = "1",
        root = root_node)

    generated_objects.add(channel)
    return channel 


def GenerateOneContentNode(channel_id,kind,title,description=None,parent=None,available=True,lang_id="en",is_root=False):
    
    new_node = ContentNode.objects.create(
    
    id = generate_random_id(),
    parent = parent,
    channel_id = channel_id,
    content_id = generate_random_id(),
    kind=kind,

    license_name=license_name,
    license_description=license_description,
    title=title ,
    description=description,
    license_owner=license_owner,
    author = developer,
    available = available)

    generated_objects.add(new_node)
    
    
    return new_node


def GenerateTag(tag_name="test_tag"):
    tag = ContentTag.objects.create(tag_name=tag_name, id = generate_random_id())
    generated_objects.add(tag)
    return tag


def GenerateLocalFile(file_preset):
    # see GetAllLocalFiles() above first 
    
    file_extension = file_preset_to_localfile_extension[file_preset]

    # file that will be used is  last one by default
    file_to_use = AllLocalFiles[file_extension][-1]

    # delete last file (aka used file)
    AllLocalFiles[file_extension].pop()

    local_file = LocalFile.objects.create(
        id=file_to_use.id,
        available = file_to_use.available,
        file_size = file_to_use.file_size,
        extension = file_extension) 

    generated_objects.add(local_file)
    
    # save for consecutive uses
    Used_Local_Files[local_file.id] = local_file
    return local_file
    

def GenerateFile(contentnode,number_of_files_to_generate):
    
    # still didn't figure out the right cases where many file objects cam map to a single localfile
    # in that case we won't need to generate a new localfile but anyway.

    preset_options = content_kind_to_file_preset[contentnode.kind]

    file_preset = preset_options[random.randint(0,len(preset_options)-1)]
    local_file = GenerateLocalFile(file_preset)

    file = File.objects.create(
        id=generate_random_id(),
        local_file = local_file,
        contentnode = contentnode,
        lang = contentnode.lang,
        preset = file_preset )  

    generated_objects.add(file)
    return file

 

def ToMemory():
    for db in settings.DATABASES:

        settings.DATABASES[db] = {
            "ENGINE" : "django.db.backends.sqlite3",
            "NAME"   : ":memory:"
        }
        try :
            del connections[db]
        except AttributeError : pass 
        call_command("migrate", interactive=False, database=db)

def StartGenerating():

    GetAllLanguages()
    GetAllLocalFiles()

    ToMemory()


    channel_id = generate_random_id()
    root_node = GenerateOneContentNode(
        channel_id,
        content_kinds.TOPIC,
        "computer science channel",
        "first root_node created solely for testing with a title of compuer science",
        is_root=True)
 

    computer_science_channel = GenerateChannel(root_node)

    channel_contents = ContentNode.objects.filter(channel_id=channel_id,available=True).exclude(kind=content_kinds.TOPIC)
    
    computer_science_channel.total_resource_count = channel_contents.count()
    
    # doesn't make sense to include a new language in the channel if that language is only included in contentnodes of kind topic, right? (so we are excluding 'topic' above from the query )
    for each_content in channel_contents:
        computer_science_channel.included_languages.add(each_content.lang)
    

    #call_command("dumpdata", *app_models, indent=4, output=fixtures_file_path, interactive=False)

    # deleting after dumping 
    # but the catch here is that all generated objects above were only in memory (i.e not saved in db) so the question here is Do we actually need to delete those objects ? since eventually they will be cleared by default. 
    for generated_object in generated_objects:
        generated_object.delete()


#StartGenerating()