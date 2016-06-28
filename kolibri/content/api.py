"""
This module acts as the only interface point between other apps and the database backend for the content.
It exposes several convenience functions for accessing content
"""
from functools import wraps

from django.db.models import Q
from kolibri.content import models as KolibriContent
from kolibri.content.utils import validate

from .constants import content_kinds
from .content_db_router import using_content_database

"""ContentDB API methods"""

def can_get_content_with_id(func):
    """
    decorator function for returning ContentNode object when giving content id.
    it can take keyword argument/s "content" or "content1" and "content2".
    """
    @wraps(func)
    def wrapper(channel_id, **kwargs):

        with using_content_database(channel_id):

            content = kwargs.get('content')
            content1 = kwargs.get('content1')
            content2 = kwargs.get('content2')
            target_node = kwargs.get('target_node')
            prerequisite = kwargs.get('prerequisite')

            if isinstance(content, KolibriContent.ContentNode) or \
                    (isinstance(content1, KolibriContent.ContentNode) and isinstance(content2, KolibriContent.ContentNode)) or \
                    (isinstance(target_node, KolibriContent.ContentNode) and isinstance(prerequisite, KolibriContent.ContentNode)):
                pass
            elif validate.is_valid_uuid(content):
                kwargs['content'] = KolibriContent.ContentNode.objects.get(content_id=content)
            elif validate.is_valid_uuid(content1) and validate.is_valid_uuid(content2):
                kwargs['content1'] = KolibriContent.ContentNode.objects.get(content_id=content1)
                kwargs['content2'] = KolibriContent.ContentNode.objects.get(content_id=content2)
            elif validate.is_valid_uuid(target_node) and validate.is_valid_uuid(prerequisite):
                kwargs['target_node'] = KolibriContent.ContentNode.objects.get(content_id=target_node)
                kwargs['prerequisite'] = KolibriContent.ContentNode.objects.get(content_id=prerequisite)
            else:
                raise TypeError("must provide a ContentNode object or a UUID content_id")
            return func(channel_id, **kwargs)

    return wrapper

def get_content_with_id(channel_id, content):
    """
    Get arbitrary sets of ContentNode objects based on content id(s).

    :param channel_id: str
    :param content_id: list or str or uuid
    :return: QuerySet of ContentNode
    """
    with using_content_database(channel_id):
        if isinstance(content, list):
            return KolibriContent.ContentNode.objects.filter(content_id__in=content)
        else:
            return KolibriContent.ContentNode.objects.filter(content_id=content)

@can_get_content_with_id
def get_ancestor_topics(channel_id, content, **kwargs):
    """"
    Get all ancestors that the their kind are topics

    :param channel_id: str
    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    return content.get_ancestors().filter(kind=content_kinds.TOPIC).using(channel_id)

@can_get_content_with_id
def immediate_children(channel_id, content, **kwargs):
    """
    Get a set of ContentNodes that have this ContentNode as the immediate parent.

    :param channel_id: str
    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    return content.get_children().using(channel_id)

@can_get_content_with_id
def leaves(channel_id, content, **kwargs):
    """
    Get all ContentNodes that are the terminal nodes and also the descendants of the this ContentNode.

    :param channel_id: str
    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    return content.get_leafnodes().using(channel_id)

@can_get_content_with_id
def get_missing_files(channel_id, content, **kwargs):
    """
    Get all missing files of the content.

    :param channel_id: str
    :param content: ContentNode or str
    :return: QuerySet of File
    """
    if content.kind == content_kinds.TOPIC:
        all_end_nodes = leaves(channel_id=channel_id, content=content)
        return KolibriContent.File.objects.using(channel_id).filter(available=False, contentnode__in=all_end_nodes)
    else:
        return KolibriContent.File.objects.using(channel_id).filter(available=False, contentnode=content)

@can_get_content_with_id
def get_all_prerequisites(channel_id, content, **kwargs):
    """
    Get cotents that are the prerequisites of this content.

    :param channel_id: str
    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    return KolibriContent.ContentNode.objects.using(channel_id).filter(is_prerequisite_of=content)

@can_get_content_with_id
def get_all_related(channel_id, content, **kwargs):
    """
    Get cotents that are related to this content.

    :param channel_id: str
    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    return KolibriContent.ContentNode.objects.using(channel_id).filter(Q(relate_to=content) | Q(is_related=content))

@can_get_content_with_id
def set_prerequisite(channel_id, target_node, prerequisite, **kwargs):
    """
    Set prerequisite relationship between content1 and content2.

    :param channel_id: str
    :param content1: ContentNode or str
    :param content2: ContentNode or str
    """
    KolibriContent.PrerequisiteContentRelationship.objects.using(channel_id).create(
        target_node=target_node, prerequisite=prerequisite)

@can_get_content_with_id
def set_is_related(channel_id, content1, content2, **kwargs):
    """
    Set is related relationship between content1 and content2.

    :param channel_id: str
    :param content1: ContentNode or str
    :param content2: ContentNode or str
    """
    KolibriContent.RelatedContentRelationship.objects.using(channel_id).create(
        contentnode_1=content1, contentnode_2=content2)

@can_get_content_with_id
def children_of_kind(channel_id, content, kind, **kwargs):
    """
    Get all ContentNodes of a particular kind under the given ContentNode.
    For kind argument, please pass in a string like "topic" or "video" or "exercise".

    :param channel_id: str
    :param content: ContentNode or str
    :param kind: str
    :return: QuerySet of ContentNode
    """
    return content.get_descendants(include_self=False).filter(kind=kind).using(channel_id)


def get_top_level_topics(channel_id):
    """
    Get all the top level topics for a channel.
    :param channel_id: str - the id for the channel.
    :return: QuerySet of ContentNode
    """
    return KolibriContent.ContentNode.objects.using(channel_id).get(parent__isnull=True).get_children().using(channel_id).filter(kind="topic")
