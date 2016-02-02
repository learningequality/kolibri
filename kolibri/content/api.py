"""
This module acts as the only interface point between other apps and the database backend for the content.
It exposes several convenience functions for accessing content
"""
import os
from kolibri.content import models as KolibriContent
from uuid import UUID
from bulk_update.helper import bulk_update
from django.core.files import File as DjFile
from functools import wraps

"""helper funcitons"""

def is_valid_uuid(uuid_to_test, version=4):
    """
    Check if uuid_to_test is a valid UUID.

    :param uuid_to_test: str
    :param version: int {1, 2, 3, 4}
    :return: True if uuid_to_test is from a valid UUID
    """
    try:
        uuid_obj = UUID(uuid_to_test, version=version)
    except ValueError:
        return False

    return str(uuid_obj) == uuid_to_test


"""ContentDB API methods"""

def can_get_content_with_id(func):
    """
    decorator function for returning ContentMetadata object when giving content id.
    it can take keyword argument/s "content" or "content1" and "content2".
    """
    @wraps(func)
    def wrapper(channel_id=None, **kwargs):
        content = kwargs.get('content')
        content1 = kwargs.get('content1')
        content2 = kwargs.get('content2')

        if isinstance(content, KolibriContent.ContentMetadata) or (isinstance(content1, KolibriContent.ContentMetadata) and isinstance(content2, KolibriContent.ContentMetadata)):
            pass
        elif is_valid_uuid(content):
            kwargs['content'] = KolibriContent.ContentMetadata.objects.using(channel).get(content_id=content)
        elif is_valid_uuid(content1) and is_valid_uuid(content2):
            kwargs['content1'] = KolibriContent.ContentMetadata.objects.using(channel).get(content_id=content1)
            kwargs['content2'] = KolibriContent.ContentMetadata.objects.using(channel).get(content_id=content2)
        else:
            raise TypeError( "must provide a ContentMetadata object or a UUID content_id")
        return func(channel_id=channel_id, **kwargs)
    return wrapper

def get_content_with_id(content_id, channel_id=None):
    """
    Get arbitrary sets of ContentMetadata objects based on content id(s).

    :param channel_id: str
    :param content_id: list or str or uuid
    :return: QuerySet of ContentMetadata
    """
    if isinstance(content_id, list):
        return KolibriContent.ContentMetadata.objects.using(channel_id).filter(content_id__in=content_id)
    else:
        return KolibriContent.ContentMetadata.objects.using(channel_id).filter(content_id=content_id)

@can_get_content_with_id
def get_ancestor_topics(channel_id=None, content=None, **kwargs):
    """"
    Get all ancestors that the their kind are topics 

    :param channel_id: str
    :param content: ContentMetadata or str
    :return: QuerySet of ContentMetadata
    """
    return content.get_ancestors().filter(kind="topic").using(channel_id)

@can_get_content_with_id
def immediate_children(channel_id=None, content=None, **kwargs):
    """
    Get a set of ContentMetadatas that have this ContentMetadata as the immediate parent.
    
    :param channel_id: str
    :param content: ContentMetadata or str
    :return: QuerySet of ContentMetadata
    """
    return content.get_children().using(channel_id)

@can_get_content_with_id
def leaves(channel_id=None, content=None, **kwargs):
    """
    Get all ContentMetadatas that are the terminal nodes and also the descendants of the this ContentMetadata.
    
    :param channel_id: str
    :param content: ContentMetadata or str
    :return: QuerySet of ContentMetadata
    """
    return content.get_leafnodes().using(channel_id)

@can_get_content_with_id
def get_all_formats(channel_id=None, content=None, **kwargs):
    """
    Get all possible formats for a particular content including its descendants' formats.
    
    :param channel_id: str
    :param content: ContentMetadata or str
    :return: QuerySet of Format
    """
    all_end_nodes = leaves(channel_id=channel_id, content=content)
    return KolibriContent.Format.objects.using(channel_id).filter(contentmetadata__in=all_end_nodes)

@can_get_content_with_id
def get_available_formats(channel_id=None, content=None, **kwargs):
    """
    Get all available formats for a particular content excluding its descendants' formats.
    if the pass-in content is a topic, this function will return null.
    
    :param channel_id: str
    :param content: ContentMetadata or str
    :return: QuerySet of Format
    """
    return KolibriContent.Format.objects.using(channel_id).filter(contentmetadata=content, available=True)

@can_get_content_with_id
def get_possible_formats(channel_id=None, content=None, **kwargs):
    """
    Get all possible formats for a particular content excluding its descendants' formats.
    if the pass-in content is a topic, this function will return null.

    :param channel_id: str
    :param content: ContentMetadata or str
    :return: QuerySet of Format
    """
    return KolibriContent.Format.objects.using(channel_id).filter(contentmetadata=content)

@can_get_content_with_id
def get_files_for_quality(channel_id=None, content=None, format_quality=None, **kwargs):
    """
    Get all files for a particular content in particular quality. 
    For format_quality argument, please pass in a string like "high" or "low" or "normal".
    topic content will return null.
    
    :param channel_id: str
    :param content: ContentMetadata or str
    :param format_quality: str
    :return: QuerySet of File
    """
    the_formats = get_possible_formats(channel_id=channel_id, content=content).filter(quality=format_quality)
    return KolibriContent.File.objects.using(channel_id).filter(format__in=the_formats)

@can_get_content_with_id
def get_missing_files(channel_id=None, content=None, **kwargs):
    """
    Get all missing files of the content.

    :param channel_id: str
    :param content: ContentMetadata or str
    :return: QuerySet of File
    """
    all_end_nodes = leaves(channel_id=channel_id, content=content)
    return KolibriContent.File.objects.using(channel_id).filter(available = False, format__contentmetadata__in=all_end_nodes)

@can_get_content_with_id
def get_all_prerequisites(channel_id=None, content=None, **kwargs):
    """
    Get cotents that are the prerequisites of this content.

    :param channel_id: str
    :param content: ContentMetadata or str
    :return: QuerySet of ContentMetadata
    """
    return KolibriContent.ContentMetadata.objects.using(channel_id).filter(prerequisite=content)

@can_get_content_with_id
def get_all_related(channel_id=None, content=None, **kwargs):
    """
    Get cotents that are related to this content.

    :param channel_id: str
    :param content: ContentMetadata or str
    :return: QuerySet of ContentMetadata
    """
    return KolibriContent.ContentMetadata.objects.using(channel_id).filter(relate_to=content)

@can_get_content_with_id
def set_prerequisite(channel_id=None, content1=None, content2=None, **kwargs):
    """
    Set prerequisite relationship between content1 and content2.

    :param channel_id: str
    :param content1: ContentMetadata or str
    :param content2: ContentMetadata or str
    """
    KolibriContent.PrerequisiteContentRelationship.objects.using(channel_id).create(relationship_type='prerequisite', contentmetadata_1=content1, contentmetadata_2=content2)

@can_get_content_with_id
def set_is_related(channel_id=None, content1=None, content2=None, **kwargs):
    """
    Set is related relationship between content1 and content2.

    :param channel_id: str
    :param content1: ContentMetadata or str
    :param content2: ContentMetadata or str
    """
    KolibriContent.RelatedContentRelationship.objects.using(channel_id).create(relationship_type='related', contentmetadata_1=content1, contentmetadata_2=content2)

@can_get_content_with_id
def children_of_kind(channel_id=None, content=None, kind=None, **kwargs):
    """
    Get all ContentMetadatas of a particular kind under the given ContentMetadata.
    For kind argument, please pass in a string like "topic" or "video" or "exercise".
    
    :param channel_id: str
    :param content: ContentMetadata or str
    :param kind: str
    :return: QuerySet of ContentMetadata
    """
    return content.get_descendants(include_self=False).filter(kind=kind).using(channel_id)

# def scan_and_update_file_availability(channel_id=None):
#     """
#     this is a safty check to ensure that the File model truthfully reflects what's actually in and not in the content_files folder.
#     """
#     all_files = KolibriContent.File.objects.using(channel_id).all().only("available", 'checksum', 'extension')
#     for f in all_files:
#         the_file_path = settings.CONTENT_COPY_DIR + '/' + f.checksum + '.' + f.extension
#         real_available = os.path.exists(the_file_path)
#         if f.available !=  real_available:
#             f.available = real_available

#     bulk_update(all_files, update_fields=['available'], using=channel_id)

def update_content_copy(file_object=None, content_copy=None):
    """
    Update the File object you pass in with the content copy
    You can pass None on content_copy to remove the associated file on disk.
    
    :param file_object: File
    :param content_copy: str
    """
    if not file_object:
        raise TypeError( "must provide a File object to update content copy")
    if content_copy:
        file_object.content_copy = DjFile(file(content_copy))
        file_object.save()
    else:
        file_object.content_copy = None

    file_object.save()


"""channel API methods"""

def get_channel(channel_identifier):
    """
    Get a ChannelMetadata object by channel id or channel name.

    :param channel_identifier: str
    :return: ChannelMetadata
    """
    if is_valid_uuid(channel_identifier):
        try:
            the_channel = KolibriContent.ChannelMetadata.objects.get(channel_id=channel_identifier)
        except KolibriContent.ChannelMetadata.DoesNotExist:
            # no employee found
            raise Exception("cannot find any channel with this channel id")
        return the_channel
    elif isinstance(channel_identifier, str):
        try:
            the_channel = KolibriContent.ChannelMetadata.objects.get(name=channel_identifier)
        except KolibriContent.ChannelMetadata.DoesNotExist:
            # no employee found
            raise Exception("cannot find any channel with this channel name")
        except KolibriContent.ChannelMetadata.MultipleObjectsReturned:
            # what to do if multiple employees have been returned?
            raise Exception("more than one channel named " + "'" + channel_identifier + "'")
        return the_channel
    else:
        raise ValueError('the channel_identifier must be either a UUID String or a normal String')

def get_available_channels():
    """
    Get all existing ChannelMetadata objects.

    :return: QuerySet of ChannelMetadata
    """
    return KolibriContent.ChannelMetadata.objects.all()

def get_channel_property(channel_identifier, property_name):
    """
    Get the ChannelMetadata property according to property_name argument

    :param channel_identifier: str
    :param property_name: str
    :return: str or boolean
    """
    if isinstance(property_name, str):
        try:
            if property_name == 'channel_id':
                return str(getattr(get_channel(channel_identifier), property_name))
            return getattr(get_channel(channel_identifier), property_name)
        except AttributeError:
            raise KeyError(property_name + " is not a valid property!")
    else:
        raise ValueError('please provide a property name in string')
