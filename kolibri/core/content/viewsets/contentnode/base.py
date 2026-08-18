from django.db.models import OuterRef
from django.http import Http404
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import content_kinds
from le_utils.constants import modalities
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.serializers import BooleanField
from rest_framework.serializers import CharField
from rest_framework.serializers import IntegerField
from rest_framework.serializers import PrimaryKeyRelatedField

from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.api import ValuesMethodField
from kolibri.core.content import models
from kolibri.core.content.utils.cache import public_metadata_cache
from kolibri.core.content.utils.cache import remote_metadata_cache
from kolibri.core.content.utils.cache import REMOTE_URL_PARAM
from kolibri.core.content.utils.paths import get_local_content_storage_file_url
from kolibri.core.device.utils import allow_peer_unlisted_channel_import
from kolibri.core.query import SQSum
from kolibri.core.serializers import KolibriModelSerializer
from kolibri.core.serializers import SplitTextField
from kolibri.utils.version import version_matches_range

from ..remote import RemoteMixin
from .filters import ContentNodeFilter
from .filters import ContentNodeSearchFilter
from .filters import OptionalContentNodePagination
from .filters import PublicContentNodePagination

# A map of fields that did not used to be in the BaseContentNodeMixin
# but now are - the map gives a default value for these to be filled in with
# if not present on an API request from a contentnode public API endpoint
contentnode_previously_omitted_fields = {
    "learner_needs": [],
    "on_device_resources": None,
    "modality": lambda resource: resource.get("options", {}).get("modality", None),
}

# The request-side counterpart to contentnode_previously_omitted_fields: query
# parameters whose name changed, mapped to the name older remotes understand
# and the version range whose public endpoint accepts the current name. When we
# proxy a request to a remote that predates the change, we rewrite the parameter
# so the remote's keyword search keeps working. The SearchFilter added ?search=
# (autocomplete) and ?question= (full-text search) in 0.20.0; older remotes only
# match on the ?keywords= filter, so both rewrite to ?keywords= there. The
# SearchFilter still accepts ?keywords= as a fallback, so the rewrite is safe
# even when the remote version cannot be determined.
contentnode_previously_renamed_params = {
    "search": ("keywords", ">=0.20.0"),
    "question": ("keywords", ">=0.20.0"),
}


class ContentNodeLanguageSerializer(KolibriModelSerializer):
    class Meta:
        model = models.Language
        fields = ("id", "lang_code", "lang_subcode", "lang_name", "lang_direction")


class ContentNodeFileSerializer(KolibriModelSerializer):
    checksum = CharField(source="local_file.id")
    available = BooleanField(source="local_file.available")
    file_size = IntegerField(source="local_file.file_size")
    extension = CharField(source="local_file.extension")
    storage_url = ValuesMethodField(
        sources=("local_file.id", "local_file.available", "local_file.extension")
    )
    lang = ContentNodeLanguageSerializer(read_only=True)

    class Meta:
        model = models.File
        fields = (
            "id",
            "available",
            "checksum",
            "extension",
            "file_size",
            "lang",
            "preset",
            "priority",
            "storage_url",
            "supplementary",
            "thumbnail",
        )

    def get_storage_url(self, obj):
        return get_local_content_storage_file_url(obj.local_file)


class AssessmentMetaDataSerializer(KolibriModelSerializer):
    class Meta:
        model = models.AssessmentMetaData
        # No "id": the payload is the reverse relation's row, which never
        # carried one.
        fields = (
            "assessment_item_ids",
            "contentnode",
            "is_manipulable",
            "mastery_model",
            "number_of_assessments",
            "randomize",
        )


class BaseContentNodeSerializer(KolibriModelSerializer):
    parent = PrimaryKeyRelatedField(read_only=True)
    lang = ContentNodeLanguageSerializer(read_only=True)
    files = ContentNodeFileSerializer(many=True, read_only=True)
    assessmentmetadata = AssessmentMetaDataSerializer(read_only=True)
    tags = CharField(source="tags.tag_name", read_only=True)
    thumbnail = CharField(read_only=True, allow_null=True)
    is_leaf = ValuesMethodField(sources=("kind",))
    accessibility_labels = SplitTextField()
    categories = SplitTextField()
    grade_levels = SplitTextField()
    learner_needs = SplitTextField()
    learning_activities = SplitTextField()
    resource_types = SplitTextField()

    class Meta:
        model = models.ContentNode
        fields = (
            "accessibility_labels",
            "ancestors",
            "assessmentmetadata",
            "author",
            "available",
            "categories",
            "channel_id",
            "coach_content",
            "content_id",
            "description",
            "duration",
            "files",
            "grade_levels",
            "id",
            "is_leaf",
            "kind",
            "lang",
            "learner_needs",
            "learning_activities",
            "license_description",
            "license_name",
            "license_owner",
            "lft",
            "modality",
            "num_coach_contents",
            "on_device_resources",
            "options",
            "parent",
            "resource_types",
            "rght",
            "sort_order",
            "tags",
            "thumbnail",
            "title",
            "tree_id",
        )

    def get_is_leaf(self, obj):
        return obj.kind != content_kinds.TOPIC


class ContentNodeSerializer(BaseContentNodeSerializer):
    # ContentNode.admin_imported is nullable pending its backfill upgrade step,
    # but the API has always rendered it a boolean.
    admin_imported = BooleanField(default=False)

    class Meta(BaseContentNodeSerializer.Meta):
        fields = BaseContentNodeSerializer.Meta.fields + ("admin_imported",)


class BaseContentNodeMixin:
    """
    A base mixin for viewsets that need to return the same format of data
    serialization for ContentNodes.
    Also used for public ContentNode endpoints!
    """

    filter_backends = (DjangoFilterBackend, ContentNodeSearchFilter)
    filterset_class = ContentNodeFilter

    serializer_class = BaseContentNodeSerializer

    # thumbnail is derived from the assembled files list, so it cannot be
    # auto-fetched.
    deferred_fields = ("thumbnail",)

    def get_queryset(self):
        if self.request.GET.get("no_available_filtering", False):
            return models.ContentNode.objects.all()
        return models.ContentNode.objects.filter(available=True)

    def consolidate(self, items, queryset):
        for item in items:
            item["thumbnail"] = next(
                (f["storage_url"] for f in item["files"] if f["thumbnail"]), None
            )
        return items


class InternalContentNodeMixin(BaseContentNodeMixin):
    """
    A mixin for all content node viewsets for internal use, whereas BaseContentNodeMixin is reused
    for public API endpoints also.
    """

    serializer_class = ContentNodeSerializer

    def update_data(self, response_data, baseurl):
        if type(response_data) is dict:
            if "more" in response_data and "results" in response_data:
                # This is a paginated object
                if response_data["more"] is not None:
                    if type(response_data["more"].get("params", None)) is dict:
                        response_data["more"]["params"][REMOTE_URL_PARAM] = baseurl
                    else:
                        response_data["more"][REMOTE_URL_PARAM] = baseurl
                response_data["results"] = self.update_data(
                    response_data["results"], baseurl
                )
            else:
                response_data = self.add_base_url_to_node(response_data, baseurl)
                response_data["admin_imported"] = (
                    response_data["id"] in self.locally_admin_imported_ids
                )
                self._fill_content_previously_omitted_fields(response_data)
                if "children" in response_data:
                    response_data["children"] = self.update_data(
                        response_data["children"], baseurl
                    )
        elif type(response_data) is list:
            data = []
            for node in response_data:
                data.append(self.update_data(node, baseurl))
            response_data = data
        return response_data

    def _fill_content_previously_omitted_fields(self, response_data):
        # As we evolve the contentnode public API, we use this to backfill
        # values so that remote responses have consistent structure
        # regardless of the version of Kolibri exposing the endpoint.
        for key, default_value in contentnode_previously_omitted_fields.items():
            if key not in response_data:
                if callable(default_value):
                    response_data[key] = default_value(response_data)
                else:
                    response_data[key] = default_value

    def update_request_params(self, params, device_info):
        # As we evolve the contentnode public API, we use this to rewrite
        # renamed query params so that a request keeps working regardless of
        # the version of Kolibri exposing the endpoint we are proxying to.
        device_info = device_info or {}
        version = device_info.get("kolibri_version")
        is_kolibri = device_info.get("application") == "kolibri"
        for current, (
            legacy,
            supported_range,
        ) in contentnode_previously_renamed_params.items():
            if current not in params:
                continue
            try:
                supported = (
                    is_kolibri
                    and version
                    and version_matches_range(version, supported_range)
                )
            except (ValueError, AttributeError):
                # An unparseable version (e.g. a development build) falls back
                # to the legacy param rather than 500ing.
                supported = False
            if not supported:
                params[legacy] = params[current]
                del params[current]
        return params

    def add_base_url_to_node(self, node, baseurl):
        baseurl_querystring = "?{}={}".format(REMOTE_URL_PARAM, baseurl)
        if node["thumbnail"]:
            node["thumbnail"] += baseurl_querystring
        for file in node["files"]:
            if file["storage_url"]:
                file["storage_url"] += baseurl_querystring
        return node


@method_decorator(remote_metadata_cache, name="dispatch")
class ContentNodeViewset(InternalContentNodeMixin, RemoteMixin, ReadOnlyValuesViewset):
    pagination_class = OptionalContentNodePagination

    def retrieve(self, request, pk=None):
        if pk is None:
            raise Http404

        if self._should_proxy_request(request):
            if self.get_queryset().filter(admin_imported=True, pk=pk).exists():
                # Used in the update method for remote request retrieval
                self.locally_admin_imported_ids = set([pk])
            else:
                # Used in the update method for remote request retrieval
                self.locally_admin_imported_ids = set()
            return self._hande_proxied_request(request)
        return super().retrieve(request, pk=pk)

    def list(self, request, *args, **kwargs):
        if self._should_proxy_request(request):
            queryset, _ = self._get_list_queryset()
            # Used in the update method for remote request retrieval
            self.locally_admin_imported_ids = set(
                queryset.filter(admin_imported=True).values_list("id", flat=True)
            )
            return self._hande_proxied_request(request)
        return super().list(request, *args, **kwargs)

    @action(detail=False)
    def random(self, request, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        max_results = int(self.request.query_params.get("max_results", 10))
        ids = list(queryset.order_by("?")[:max_results].values_list("id", flat=True))
        queryset = models.ContentNode.objects.filter(id__in=ids)
        return Response(self.serialize(queryset))

    @action(detail=False)
    def descendants_assessments(self, request):
        ids = self.request.query_params.get("ids", None)
        if not ids:
            return Response([])
        queryset = self.filter_queryset(self.get_queryset())
        data = list(
            queryset.annotate(
                num_assessments=SQSum(
                    models.ContentNode.objects.filter(
                        tree_id=OuterRef("tree_id"),
                        lft__gte=OuterRef("lft"),
                        lft__lt=OuterRef("rght"),
                        kind=content_kinds.EXERCISE,
                        available=True,
                    )
                    # Counts feed the coach quiz resource picker, which must not
                    # offer surveys (#13631).
                    .exclude(modality=modalities.SURVEY)
                    .values_list(
                        "assessmentmetadata__number_of_assessments", flat=True
                    ),
                    field="number_of_assessments",
                )
            ).values("id", "num_assessments")
        )
        return Response(data)

    @action(detail=True)
    def recommendations_for(self, request, **kwargs):
        """
        Recommend items that are similar to this piece of content.
        """
        queryset = self.filter_queryset(self.get_queryset())
        pk = kwargs.get("pk", None)
        node = get_object_or_404(queryset, pk=pk)
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset & node.get_siblings(include_self=False).exclude(
            kind=content_kinds.TOPIC
        )
        return Response(self.serialize(queryset))


def filter_public_channel_nodes(queryset):
    # Unlisted channels are hidden from the peer channel list unless unlisted
    # import is allowed, so hide their nodes from the content endpoints too —
    # otherwise a search surfaces resources from channels the peer cannot browse.
    # Mirrors the channel visibility of PublicChannelMetadataViewSet.
    if allow_peer_unlisted_channel_import():
        return queryset
    return queryset.filter(
        channel_id__in=models.ChannelMetadata.objects.filter(public=True).values("id")
    )


@method_decorator(public_metadata_cache, name="dispatch")
class PublicContentNodeViewSet(BaseContentNodeMixin, ReadOnlyValuesViewset):
    pagination_class = PublicContentNodePagination

    def get_queryset(self):
        return filter_public_channel_nodes(super().get_queryset())
