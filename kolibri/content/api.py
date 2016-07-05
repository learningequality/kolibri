"""
This module acts as the only interface point between other apps and the database backend for the content.
It exposes several convenience functions for accessing content
"""
from django.db.models import Q
from kolibri.content import models
from kolibri.content.utils import validate

from .constants import content_kinds

"""ContentDB API methods"""


def get_contentnode_from_instance_or_instance_id(content):
    if isinstance(content, models.ContentNode):
        return content
    elif validate.is_valid_uuid(content):
        return models.ContentNode.objects.get(instance_id=content)
    else:
        raise TypeError("Argument must be a ContentNode or instance_id UUID." % content)


def get_content_with_id_list(content):
    """
    Get arbitrary sets of ContentNode objects based on content ids.
    :param content: list of instance_id uuids
    :return: QuerySet of ContentNode
    """
    if isinstance(content, list):
        return models.ContentNode.objects.filter(instance_id__in=content)
    else:
        raise TypeError("Must provide a list of UUID instance_id in order to use this method.")


def get_ancestor_topics(content, **kwargs):
    """"
    Get all ancestors that the their kind are topics

    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    content_instance = get_contentnode_from_instance_or_instance_id(content)
    return content_instance.get_ancestors().filter(kind=content_kinds.TOPIC)


def immediate_children(content, **kwargs):
    """
    Get a set of ContentNodes that have this ContentNode as the immediate parent.

    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    content_instance = get_contentnode_from_instance_or_instance_id(content)
    return content_instance.get_children()


def leaves(content, **kwargs):
    """
    Get all ContentNodes that are the terminal nodes and also the descendants of the this ContentNode.

    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    content_instance = get_contentnode_from_instance_or_instance_id(content)
    return content_instance.get_leafnodes()


def get_missing_files(content, **kwargs):
    """
    Get all missing files of the content.

    :param content: ContentNode or str
    :return: QuerySet of File
    """
    content_instance = get_contentnode_from_instance_or_instance_id(content)
    if content_instance.kind == content_kinds.TOPIC:
        all_end_nodes = leaves(content=content_instance)
        return models.File.objects.filter(available=False, contentnode__in=all_end_nodes)
    else:
        return models.File.objects.filter(available=False, contentnode=content_instance)


def get_all_prerequisites(content, **kwargs):
    """
    Get cotents that are the prerequisites of this content.

    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    content_instance = get_contentnode_from_instance_or_instance_id(content)
    return models.ContentNode.objects.filter(is_prerequisite_of=content_instance)


def get_all_related(content, **kwargs):
    """
    Get cotents that are related to this content.

    :param content: ContentNode or str
    :return: QuerySet of ContentNode
    """
    content_instance = get_contentnode_from_instance_or_instance_id(content)
    return models.ContentNode.objects.filter(Q(relate_to=content_instance) | Q(is_related=content_instance))


def set_prerequisite(target_node, prerequisite, **kwargs):
    """
    Set prerequisite relationship between content1 and content2.

    :param content1: ContentNode or str
    :param content2: ContentNode or str
    """
    target_instance = get_contentnode_from_instance_or_instance_id(target_node)
    prerequisite_instance = get_contentnode_from_instance_or_instance_id(prerequisite)
    models.PrerequisiteContentRelationship.objects.create(
        target_node=target_instance, prerequisite=prerequisite_instance)


def set_is_related(content1, content2, **kwargs):
    """
    Set is related relationship between content1 and content2.

    :param content1: ContentNode or str
    :param content2: ContentNode or str
    """
    content1_instance = get_contentnode_from_instance_or_instance_id(content1)
    content2_instance = get_contentnode_from_instance_or_instance_id(content2)
    models.RelatedContentRelationship.objects.create(
        contentnode_1=content1_instance, contentnode_2=content2_instance)


def descendants_of_kind(content, kind, **kwargs):
    """
    Get all ContentNodes of a particular kind under the given ContentNode.
    For kind argument, please pass in a string like "topic" or "video" or "exercise".

    :param content: ContentNode or str
    :param kind: str
    :return: QuerySet of ContentNode
    """
    content_instance = get_contentnode_from_instance_or_instance_id(content)
    return content_instance.get_descendants(include_self=False).filter(kind=kind)


def get_top_level_topics():
    """
    Get all the top level topics for a channel.
    :return: QuerySet of ContentNode
    """
    return models.ContentNode.objects.get(parent__isnull=True).get_children().filter(kind="topic")
