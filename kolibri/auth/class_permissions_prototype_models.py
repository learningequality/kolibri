#####################################################################################################################
### This file is "realistic pseudocode" for the implementation of some of the class-based permissions features on ###
### the models. Integration, and addition of tests, will take place following review of the general approach, and ###
### discussion of next steps. Note that pieces of the models have been omitted here, as they were not needed for  ###
### the purposes of illustration. Some suggestions for tweaks to the actual models will come as a separate PR.    ###
#####################################################################################################################

from django.utils.translation import ugettext as _
from django.db import models

from .permissions import *

ROLE_CHOICES = (
    ("learner", _("Learner")),
    ("coach", _("Coach")),
    ("admin", _("Admin")),
)

class RoleQuerySet(models.QuerySet):
    """
    Queryset for the Role model with additional helper methods for efficiently querying by role-based/tree-based
    relationships between users and other users or collections.
    """

    def __init__(self):

        # retrieve the table names that will be used as context for building the query
        self.table_names = {
            "role_table": Role._meta.db_table,
            "source_role": Role._meta.db_table, # alias to the Role table, to make later queries more readable
            "collection_table": Collection._meta.db_table,
        }

        # list out the tables (along with aliases) that we'll need for use in the WHERE clause
        self.tables = (
            '"{collection_table}" AS "source_collection"',
            '"{collection_table}" AS "target_collection"',
            '"{role_table}" AS "target_role"',
        )

        # list out the primary role-based conditions for the WHERE clause
        self.base_conditions = (
            "{source_role}.collection_id = source_collection.id",
            "{source_role}.type != 'learner'",
            "target_collection.lft BETWEEN source_collection.lft AND source_collection.rght",
        )

    def filter_by_relationship(self, source_user, target_user=None, target_collection=None):
        """
        Filters a queryset of Role objects to include only those that link the source_user to the target_user
        or target_collection, through the Collection hierarchy.
        """

        assert (target_user or target_collection) and not (target_user and target_collection), \
            "Exactly one of `target_user` and `target_collection` must be provided."

        # start with the basic conditions, establishing relationship between source user, her roles, and collections
        conditions = self.base_conditions + (
            "{source_role}.user_id = {user_id}".format(user_id=source_user.id),
        )

        # if the target is a user, establish rules linking that user to the target collection(s) via a role
        if target_user:
            conditions += (
                "target_role.collection_id = target_collection.id",
                "target_role.type = 'learner'",
                "target_role.user_id = {user_id}".format(user_id=target_user.id),
            )

        # if the target is a collection, link that collection to the target collection
        if target_collection:
            conditions += (
                "target_collection.id = {collection_id}".format(collection_id=target_collection.id),
            )

        # execute the query to get a queryset of all roles the provided user has in relation to target user/collection
        queryset = self.extra(
            tables=self._format_with_table_names(tables),
            where=self._format_with_table_names(conditions)
        )

        return queryset

    def _format_with_table_names(self, items):
        return [item.format(**self.table_names) for item in items]


class Role(models.Model):

    kind = models.CharField(max_length=50, choices=ROLE_CHOICES)
    user = models.ForeignKey('FacilityUser')
    collection = models.ForeignKey('Collection')

    objects = RoleQuerySet.as_manager()


class DeviceOwner(BaseUser):

    permissions = IsDeviceOwner()

    # ...

    def role_types_in_relation_to_user(self, target_user):
        """
        Returns a set of all role types this user has in relation to the target user.
        As a DeviceOwner has full admin privileges, we don't need to do any further checking.
        """
        return set(["admin"])

    def role_types_in_relation_to_collection(self, target_collection):
        """
        Returns a set of all role types this user has in relation to the target collection.
        As a DeviceOwner has full admin privileges, we don't need to do any further checking.
        """
        return set(["admin"])


class FacilityUser(BaseUser):

    permissions = FacilityUserPermissions()

    # ...

    def role_types_in_relation_to_user(self, target_user):
        """
        Returns a set of all role types this user has in relation to the target user.
        """

        # set of strings representing the role types this user has in relation to the target user
        role_types = set()

        # check whether the provided user is this user, in which case we add a special role type "self"
        if target_user == self:
            role_types.add("self")

        # fetch all the Role objects this user has in relation to the target user
        roles = Role.objects.filter_by_relationship(source_user=self, target_user=target_user)

        # retrieve the type strings for each of the roles found, and add them into the set
        role_types = role_types.union(role["type"] for role in roles.values("type"))

        return role_types

    def role_types_in_relation_to_collection(self, target_collection):
        """
        Returns a set of all role types this user has in relation to the target collection.
        """

        # set of strings representing the role types this user has in relation to the target user
        role_types = set()

        # fetch all the Role objects this user has in relation to the target collection
        roles = Role.objects.filter_by_relationship(source_user=self, target_collection=target_collection)

        # retrieve the type strings for each of the roles found, and add them into the set
        role_types = role_types.union(role["type"] for role in roles.values("type"))

        # return the type strings for each of the roles found
        return set(role["type"] for role in roles.values("type"))


class ContentLog(models.Model):

    permissions = UserDataPermissions()

    # ...


class ContentInteractionLog(model.Model):

    permissions = UserDataPermissions()

    # ...
