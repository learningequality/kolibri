from collections import namedtuple

from django.core.exceptions import ImproperlyConfigured
from django.db.models import Q
from morango.models.core import Store
from morango.models.core import SyncableModel


ContentAssignment = namedtuple(
    "ContentAssignment", ["contentnode_id", "source_model", "source_id", "metadata"]
)

DeletedAssignment = namedtuple("ContentAssignment", ["source_model", "source_id"])

# a global registry of usages of the `ContentAssignmentManager` so we can find models where it
# was implemented and gather their assignments
CONTENT_ASSIGNMENT_MANAGER_REGISTRY = {}


class ContentAssignmentManager(object):
    """
    The ContentAssignmentManager is attached to a model, similar to a Django manager, but it's
    purpose is to allow introspection of changes to the model that occur during a sync, and to
    generate 'assignments' that are translated into `ContentRequest`s
    """

    __slots__ = (
        "model",
        "name",
        "one_to_many",
        "filters",
        "lookup_field",
        "lookup_func",
    )

    def __init__(
        self, one_to_many=False, filters=None, lookup_field=None, lookup_func=None
    ):
        """
        :param one_to_many: indicating that the associated model maps to multiple content nodes
        :type one_to_many: bool
        :param filters: dict of QuerySet filters to apply for determining validity of assignments
        :type filters: dict
        :param lookup_field: the model field which maps the content node
        :type lookup_field: str
        :param lookup_func: a function which receives the value of `lookup_field` to return nodes
            and metadata
        :type lookup_func: callable<tuple[contentnode_id: str, metadata: None|dict]>
        """
        self.model = None
        self.name = None
        self.one_to_many = one_to_many
        self.filters = filters
        self.lookup_field = lookup_field
        self.lookup_func = lookup_func

    def contribute_to_class(self, model, name):
        """
        This is a special method associated with Django. When an instance of this class is
        set on a Django model, it will call this method, which gives the ability to make the
        association with the model

        :type model: SyncableModel
        :type name: str
        """
        if not issubclass(model, SyncableModel):
            raise ImproperlyConfigured(
                "{} is only valid on SyncableModels".format(self.__class__.__name__)
            )

        if self.one_to_many and self.lookup_func is None:
            raise ImproperlyConfigured(
                "One-to-many assignment models need a lookup function"
            )

        self.model = model
        self.name = name
        setattr(model, name, self)
        CONTENT_ASSIGNMENT_MANAGER_REGISTRY.update({model.__class__.__name__: self})

    @classmethod
    def find_all_downloadable_assignments(cls, transfer_session_id):
        """
        :param transfer_session_id:
        :rtype: list of ContentAssignment
        """
        for manager in CONTENT_ASSIGNMENT_MANAGER_REGISTRY.values():
            for assignment in manager.find_downloadable_assignments(
                transfer_session_id
            ):
                yield assignment

    @classmethod
    def find_all_removable_assignments(cls, transfer_session_id):
        """
        :param transfer_session_id:
        :rtype: list of ContentAssignment or DeletedAssignment
        """
        for manager in CONTENT_ASSIGNMENT_MANAGER_REGISTRY.values():
            for assignment in manager.find_removable_assignments(transfer_session_id):
                yield assignment

    def _get_modified_store(self, transfer_session_id):
        """
        Queryset for finding the Store records affected by a sync
        """
        return Store.objects.filter(
            model_name=self.model.morango_model_name,
            last_transfer_session_id=transfer_session_id,
        )

    def _get_assignments(self, model_qs):
        """
        Shared method that iterates of a model queryset, finding `lookup_field` and calling
        `lookup_func` if necessary for each result

        :param model_qs: The queryset to find `lookup_field` and sources
        :type model_qs: django.db.models.QuerySet
        :rtype: list of ContentAssignment
        """
        for source_id, lookup_field_value in model_qs.values_list(
            "id", self.lookup_field
        ):
            # avoid duplicate contentnode_ids for same source
            contentnode_ids = set()
            assignments = []

            # when one_to_many, we could get more than one contentnode assignment per source
            if self.one_to_many:
                assignments.extend(self.lookup_func(lookup_field_value))
            elif self.lookup_func is not None:
                assignments.append(self.lookup_func(lookup_field_value))
            else:
                assignments.append((lookup_field_value, None))

            for contentnode_id, metadata in assignments:
                if contentnode_id not in contentnode_ids:
                    yield ContentAssignment(
                        contentnode_id,
                        self.model.morango_model_name,
                        source_id,
                        metadata,
                    )
                    contentnode_ids.update([contentnode_id])

    def find_downloadable_assignments(self, transfer_session_id):
        """
        :param transfer_session_id:
        :return: yields ContentAssigment tuples
        :rtype: list of ContentAssignment
        """
        modified_store = self._get_modified_store(transfer_session_id).exclude(
            Q(deleted=True) | Q(hard_deleted=True) | ~Q(deserialization_error="")
        )

        model_qs = self.model.objects.filter(
            pk__in=modified_store.values_list("id", flat=True)
        )
        if self.filters:
            model_qs = model_qs.filter(**self.filters)

        for assignment in self._get_assignments(model_qs):
            yield assignment

    def find_removable_assignments(self, transfer_session_id):
        """
        :param transfer_session_id:
        :return: yields ContentAssigment or DeletedAssignment tuples
        :rtype: list of ContentAssignment or DeletedAssignment
        """
        modified_store = self._get_modified_store(transfer_session_id)

        if self.filters:
            # modified models that do not match filters
            model_qs = self.model.objects.filter(
                pk__in=modified_store.values_list("id", flat=True)
            ).exclude(**self.filters)
            for assignment in self._get_assignments(model_qs):
                yield assignment

        # models that were deleted
        model_qs = modified_store.filter(Q(deleted=True) | Q(hard_deleted=True))
        for source_id in model_qs.values_list("id", flat=True):
            yield DeletedAssignment(self.model.morango_model_name, source_id)
