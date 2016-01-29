"""
This module acts as the only interface point between other apps and the database backend for the content.
It exposes several convenience functions for accessing content
"""
from kolibri.content import models as content
from uuid import UUID
import os
from bulk_update.helper import bulk_update
from django.core.files import File as DjFile

"""helper funcitons"""

def is_valid_uuid(uuid_to_test, version=4):
    """
    Check if uuid_to_test is a valid UUID.

    Parameters
    ----------
    uuid_to_test : str
    version : {1, 2, 3, 4}

    Returns
    -------
    `True` if uuid_to_test is a valid UUID, otherwise `False`.

    Examples
    --------
    >>> is_valid_uuid('c9bf9e57-1685-4c89-bafb-ff5af830be8a')
    True
    >>> is_valid_uuid('c9bf9e58')
    False
    """
    try:
        uuid_obj = UUID(uuid_to_test, version=version)
    except:
        return False

    return str(uuid_obj) == uuid_to_test


"""ContentDB API methods"""

def can_get_content_with_id(func):
    """
    decorator function for returning ContentMetadata object when giving content id
    it can take keyword argument/s "content" or "content1" and "content2"
    """
    def wrapper(channel_id=None, **kwargs):
        content = kwargs.get('content')
        content1 = kwargs.get('content1')
        content2 = kwargs.get('content2')

        if isinstance(content, ContentMetadata) or (isinstance(content1, ContentMetadata) and isinstance(content2, ContentMetadata)):
            pass
        elif is_valid_uuid(content):
            kwargs['content'] = content.ContentMetadata.objects.using(channel).get(content_id=content)
        elif is_valid_uuid(content1) and is_valid_uuid(content2):
            kwargs['content1'] = content.ContentMetadata.objects.using(channel).get(content_id=content1)
            kwargs['content2'] = content.ContentMetadata.objects.using(channel).get(content_id=content2)
        else:
            raise TypeError( "must provide a ContentMetadata object or a UUID content_id")
        return func(channel_id=channel_id, **kwargs)
    return wrapper

def get_content_with_id(content_id, channel_id=None):
    """Return arbitrary sets of Content Metadata objects based on content id(s)"""
    if isinstance(content_id, list):
        return content.ContentMetadata.objects.using(channel_id).filter(content_id__in=content_id)
    else:
        return content.ContentMetadata.objects.using(channel_id).filter(content_id=content_id)

@can_get_content_with_id
def get_ancestor_topics(channel_id=None, content=None, **kwargs):
    return content.get_ancestors().filter(kind="topic").using(channel_id)

@can_get_content_with_id
def immediate_children(channel_id=None, content=None, **kwargs):
    """The content can be a ContentMetadatas object or a content_id string."""
    """Return a set of ContentMetadatas that has this ContentMetadata as the immediate parent."""
    return content.get_children().using(channel_id)

@can_get_content_with_id
def leaves(channel_id=None, content=None, **kwargs):
    """The content can be a ContentMetadatas object or a content_id string."""
    """return all ContentMetadatas that are the terminal nodes and also the descendants of the this ContentMetadata"""
    return content.get_leafnodes().using(channel_id)

@can_get_content_with_id
def get_all_formats(channel_id=None, content=None, **kwargs):
    """The content can be a ContentMetadatas object or a content_id string."""
    """return all possible formats for a particular content including its descendants' formats"""
    all_end_nodes = leaves(channel_id=channel_id, content=content)
    return content.Format.objects.using(channel_id).filter(contentmetadata__in=all_end_nodes)

@can_get_content_with_id
def get_available_formats(channel_id=None, content=None, **kwargs):
    """The content can be a ContentMetadatas object or a content_id string."""
    """return all available formats for a particular content excluding its descendants' formats
    if the pass-in content is a topic, this function will return null"""
    return content.Format.objects.using(channel_id).filter(contentmetadata=content, available=True)

@can_get_content_with_id
def get_possible_formats(channel_id=None, content=None, **kwargs):
    """The content can be a ContentMetadatas object or a content_id string."""
    """return all possible formats for a particular content excluding its descendants' formats
    if the pass-in content is a topic, this function will return null"""
    return content.Format.objects.using(channel_id).filter(contentmetadata=content)

@can_get_content_with_id
def get_files_for_quality(channel_id=None, content=None, format_quality=None, **kwargs):
    """The content can be a ContentMetadatas object or a content_id string."""
    """return all files for a particular content in particular quality. 
    For the first argument, please pass in a string like "high" or "low" or "normal"
    For the second argument, You can pass in either a ContentMetadata object with keyword 'content' or a uuid4 with keyword "content_id"
    topic content will return null."""
    the_formats = get_possible_formats(channel_id=channel_id, content=content).filter(quality=format_quality)
    return content.File.objects.using(channel_id).filter(format__in=the_formats)

@can_get_content_with_id
def get_missing_files(channel_id=None, content=None, **kwargs):
    """The content can be a ContentMetadatas object or a content_id string."""
    """return all missing files under the content"""
    all_end_nodes = leaves(channel_id=channel_id, content=content)
    return content.File.objects.using(channel_id).filter(available = False, format__contentmetadata__in=all_end_nodes)

@can_get_content_with_id
def get_all_prerequisites(channel_id=None, content=None, **kwargs):
    """The content can be a ContentMetadatas object or a content_id string."""
    """return cotents that are the prerequisites of this content"""
    return content.ContentMetadata.objects.using(channel_id).filter(prerequisite=content)

@can_get_content_with_id
def get_all_related(channel_id=None, content=None, **kwargs):
    """The content can be a ContentMetadatas object or a content_id string."""
    """return cotents that are the related to this content"""
    return content.ContentMetadata.objects.using(channel_id).filter(relate_to=content)

@can_get_content_with_id
def set_prerequisite(channel_id=None, content1=None, content2=None, **kwargs):
    """set prerequisite relationship between content1 and content2"""
    content.PrerequisiteContentRelationship.objects.using(channel_id).create(relationship_type='prerequisite', contentmetadata_1=content1, contentmetadata_2=content2)

@can_get_content_with_id
def set_is_related(channel_id=None, content1=None, content2=None, **kwargs):
    """set related relationship between content1 and content2"""
    content.RelatedContentRelationship.objects.using(channel_id).create(relationship_type='related', contentmetadata_1=content1, contentmetadata_2=content2)

@can_get_content_with_id
def children_of_kind(channel_id=None, content=None, kind=None, **kwargs):
    """The content can be a ContentMetadatas object or a content_id string."""
    """return all ContentMetadatas of a particular kind under the given ContentMetadata"""
    return content.get_descendants(include_self=False).filter(kind=kind).using(channel_id)

# def scan_and_update_file_availability(channel_id=None):
#     """this is a safty check to ensure that the File model truthfully reflects what's actually in and not in the content_files folder"""
#     all_files = content.File.objects.using(channel_id).all().only("available", 'checksum', 'extension')
#     for f in all_files:
#         the_file_path = settings.CONTENT_COPY_DIR + '/' + f.checksum + '.' + f.extension
#         real_available = os.path.exists(the_file_path)
#         if f.available !=  real_available:
#             f.available = real_available

#     bulk_update(all_files, update_fields=['available'], using=channel_id)

def update_content_copy(file_object=None, content_copy=None):
    """you can pass None on content_copy to remove the associated file on disk"""
    if not file_object:
        raise TypeError( "must provide a File object to update content copy")
    if content_copy:
        file_object.content_copy = DjFile(file(content_copy))
        file_object.save()
    else:
        file_object.content_copy = None

    file_object.save()


"""channel API methods"""

def process_channel_identifier(channel_identifier):
    """this func will take a channel id or channel name and return a content.ChannelMetadata object"""
    if is_valid_uuid(channel_identifier):
        try:
            the_channel = content.ChannelMetadata.objects.get(channel_id=channel_identifier)
        except content.ChannelMetadata.DoesNotExist:
            # no employee found
            raise Exception("cannot find any channel with this channel id")
        return the_channel
    elif isinstance(channel_identifier, str):
        try:
            the_channel = content.ChannelMetadata.objects.get(name=channel_identifier)
        except content.ChannelMetadata.DoesNotExist:
            # no employee found
            raise Exception("cannot find any channel with this channel name")
        except content.ChannelMetadata.MultipleObjectsReturned:
            # what to do if multiple employees have been returned?
            raise Exception("more than one channel named " + "'" + channel_identifier + "'")
        return the_channel
    else:
        raise ValueError('the channel_identifier must be either a UUID String or a normal String')

def get_available_channels():
    return content.ChannelMetadata.objects.all()

def get_channel(channel_identifier):
    return process_channel_identifier(channel_identifier)

def get_channel_name(channel_identifier):
    return process_channel_identifier(channel_identifier).name

def get_channel_id(channel_identifier):
    the_channel_id = process_channel_identifier(channel_identifier).channel_id
    return str(the_channel_id)

def get_channel_author(channel_identifier):
    return process_channel_identifier(channel_identifier).author

def get_channel_description(channel_identifier):
    return process_channel_identifier(channel_identifier).description

def get_channel_theme(channel_identifier):
    return process_channel_identifier(channel_identifier).theme