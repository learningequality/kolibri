"""
This module acts as the only interface point between other apps and the database backend for the content.
It exposes several convenience functions for accessing content
"""
from django.db.models import Q
from kolibri.content import models as KolibriContent
from kolibri.content.utils import validate

from .constants import content_kinds
from .content_db_router import using_content_database

"""ContentDB API methods"""

def get_instance_with_pk_or_uuid(channel_id, content):
    with using_content_database(channel_id):
        if validate.is_valid_uuid(content):
            return KolibriContent.ContentNode.objects.get(content_id=content)
        elif isinstance(content, KolibriContent.ContentNode):
            return content
        else:
            try:
                pk = int(content)
            except (ValueError, TypeError):
                raise TypeError("Must provide a pk or a ContentNode object or a UUID content_id.")
            return KolibriContent.ContentNode.objects.get(pk=pk)

def get_content_with_id_list(channel_id, content):
    """
    Get arbitrary sets of ContentNode objects based on content ids.
    :param channel_id: str
    :param content_id: list of uuid
    :return: QuerySet of ContentNode
    """

    with using_content_database(channel_id):
        if isinstance(content, list):
            return KolibriContent.ContentNode.objects.filter(content_id__in=content)
        else:
            raise TypeError("Must provide a list of UUID content_id in order to use this method.")

def get_ancestor_topics(channel_id, content, **kwargs):
    """"
    Get all ancestors that the their kind are topics

    :param channel_id: str
    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    with using_content_database(channel_id):
        content_instance = get_instance_with_pk_or_uuid(channel_id, content)
        return content_instance.get_ancestors().filter(kind=content_kinds.TOPIC)

def immediate_children(channel_id, content, **kwargs):
    """
    Get a set of ContentNodes that have this ContentNode as the immediate parent.

    :param channel_id: str
    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    with using_content_database(channel_id):
        content_instance = get_instance_with_pk_or_uuid(channel_id, content)
        return content_instance.get_children()

def leaves(channel_id, content, **kwargs):
    """
    Get all ContentNodes that are the terminal nodes and also the descendants of the this ContentNode.

    :param channel_id: str
    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    with using_content_database(channel_id):
        content_instance = get_instance_with_pk_or_uuid(channel_id, content)
        return content_instance.get_leafnodes()

def get_missing_files(channel_id, content, **kwargs):
    """
    Get all missing files of the content.

    :param channel_id: str
    :param content: ContentNode or str
    :return: QuerySet of File
    """
    with using_content_database(channel_id):
        content_instance = get_instance_with_pk_or_uuid(channel_id, content)
        if content_instance.kind == content_kinds.TOPIC:
            all_end_nodes = leaves(channel_id=channel_id, content=content_instance)
            return KolibriContent.File.objects.filter(available=False, contentnode__in=all_end_nodes)
        else:
            return KolibriContent.File.objects.filter(available=False, contentnode=content_instance)

def get_all_prerequisites(channel_id, content, **kwargs):
    """
    Get cotents that are the prerequisites of this content.

    :param channel_id: str
    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    with using_content_database(channel_id):
        content_instance = get_instance_with_pk_or_uuid(channel_id, content)
        return KolibriContent.ContentNode.objects.filter(is_prerequisite_of=content_instance)

def get_all_related(channel_id, content, **kwargs):
    """
    Get cotents that are related to this content.

    :param channel_id: str
    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    with using_content_database(channel_id):
        content_instance = get_instance_with_pk_or_uuid(channel_id, content)
        return KolibriContent.ContentNode.objects.filter(Q(relate_to=content_instance) | Q(is_related=content_instance))

def set_prerequisite(channel_id, target_node, prerequisite, **kwargs):
    """
    Set prerequisite relationship between content1 and content2.

    :param channel_id: str
    :param content1: ContentNode or str
    :param content2: ContentNode or str
    """
    with using_content_database(channel_id):
        target_instance = get_instance_with_pk_or_uuid(channel_id, target_node)
        prerequisite_instance = get_instance_with_pk_or_uuid(channel_id, prerequisite)
        KolibriContent.PrerequisiteContentRelationship.objects.create(
            target_node=target_instance, prerequisite=prerequisite_instance)

def set_is_related(channel_id, content1, content2, **kwargs):
    """
    Set is related relationship between content1 and content2.

    :param channel_id: str
    :param content1: ContentNode or str
    :param content2: ContentNode or str
    """
    with using_content_database(channel_id):
        content1_instance = get_instance_with_pk_or_uuid(channel_id, content1)
        content2_instance = get_instance_with_pk_or_uuid(channel_id, content2)
        KolibriContent.RelatedContentRelationship.objects.create(
            contentnode_1=content1_instance, contentnode_2=content2_instance)

def children_of_kind(channel_id, content, kind, **kwargs):
    """
    Get all ContentNodes of a particular kind under the given ContentNode.
    For kind argument, please pass in a string like "topic" or "video" or "exercise".

    :param channel_id: str
    :param content: ContentNode or str
    :param kind: str
    :return: QuerySet of ContentNode
    """
    with using_content_database(channel_id):
        content_instance = get_instance_with_pk_or_uuid(channel_id, content)
        return content_instance.get_descendants(include_self=False).filter(kind=kind)


def get_top_level_topics(channel_id):
    """
    Get all the top level topics for a channel.
    :param channel_id: str - the id for the channel.
    :return: QuerySet of ContentNode
    """
    with using_content_database(channel_id):
        return KolibriContent.ContentNode.objects.get(parent__isnull=True).get_children().filter(kind="topic")
