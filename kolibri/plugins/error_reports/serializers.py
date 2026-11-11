import json
import math
from typing import ClassVar

from rest_framework import serializers

from .constants import BACKEND
from .constants import FRONTEND
from .constants import TASK

MAX_TRACEBACK_LENGTH = 65536

MAX_ERROR_MESSAGE_LENGTH = 1024

MAX_JSON_DEPTH = 10


def _sanitize(text):
    return (
        text.replace("\x00", "\N{REPLACEMENT CHARACTER}")
        .encode("utf-16", "surrogatepass")
        .decode("utf-16", "replace")
    )


def _sanitize_json(value):
    if isinstance(value, str):
        return _sanitize(value)
    if isinstance(value, dict):
        return {
            _sanitize(str(key)): _sanitize_json(item) for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [_sanitize_json(item) for item in value]
    return value


class SanitizedCharField(serializers.CharField):
    def to_internal_value(self, data):
        return _sanitize(super().to_internal_value(data))


def _text(**kwargs):
    kwargs.setdefault("required", False)
    kwargs.setdefault("allow_null", True)
    kwargs.setdefault("allow_blank", True)
    return SanitizedCharField(trim_whitespace=False, **kwargs)


def _nesting_depth(value):
    deepest = 0
    stack = [(value, 1)]
    while stack:
        item, depth = stack.pop()
        if isinstance(item, dict):
            item = list(item.values())
        if isinstance(item, (list, tuple)):
            deepest = max(deepest, depth)
            stack.extend((child, depth + 1) for child in item)
    return deepest


class FiniteFloatField(serializers.FloatField):
    def to_internal_value(self, data):
        try:
            value = super().to_internal_value(data)
        except OverflowError:
            self.fail("invalid")
        if not math.isfinite(value):
            self.fail("invalid")
        return value


class TextDictField(serializers.DictField):
    def __init__(self, **kwargs):
        super().__init__(child=_text(), **kwargs)

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = {_sanitize(str(key)): value for key, value in data.items()}
        return super().to_internal_value(data)


class BoundedJSONField(serializers.JSONField):
    default_error_messages: ClassVar[dict] = {
        "too_deep": "Value is nested more than {max_depth} levels deep.",
    }

    def to_internal_value(self, data):
        if _nesting_depth(data) > MAX_JSON_DEPTH:
            self.fail("too_deep", max_depth=MAX_JSON_DEPTH)
        data = _sanitize_json(data)
        try:
            json.dumps(data, allow_nan=False)
        except (TypeError, ValueError):
            self.fail("invalid")
        return data


def bounded_json_or_none(value):
    try:
        return BoundedJSONField(allow_null=True).run_validation(value)
    except serializers.ValidationError:
        return None


class VersionInfoSerializer(serializers.Serializer):
    name = _text()
    version = _text()


class FrameSerializer(serializers.Serializer):
    filename = _text()
    abs_path = _text()
    function = _text()
    lineno = serializers.IntegerField(required=False, allow_null=True)
    colno = serializers.IntegerField(required=False, allow_null=True)
    in_app = serializers.BooleanField(required=False)


class StacktraceSerializer(serializers.Serializer):
    frames = FrameSerializer(many=True, required=False)


class MechanismSerializer(serializers.Serializer):
    type = _text()
    handled = serializers.BooleanField(required=False)


class ExceptionValueSerializer(serializers.Serializer):
    type = _text()
    value = _text(max_length=MAX_ERROR_MESSAGE_LENGTH)
    mechanism = MechanismSerializer(required=False)
    stacktrace = StacktraceSerializer(required=False)


class ExceptionSerializer(serializers.Serializer):
    values = ExceptionValueSerializer(many=True, required=False)


class RuntimeContextsSerializer(serializers.Serializer):
    runtime = VersionInfoSerializer(required=False)


class EventSerializer(serializers.Serializer):
    """
    The Sentry event envelope shared by every category, so the telemetry
    server can re-report it into Sentry with minimal mapping.
    """

    platform = _text()
    level = _text()
    exception = ExceptionSerializer(required=False)
    traceback = _text(max_length=MAX_TRACEBACK_LENGTH)


class DeviceSerializer(serializers.Serializer):
    model = _text()
    type = _text()
    vendor = _text()
    is_touch_device = serializers.BooleanField(required=False)
    screen_breakpoint = serializers.IntegerField(required=False, min_value=0)


class RouteSerializer(serializers.Serializer):
    name = _text()
    path = _text()
    params = TextDictField(required=False)


class AppSerializer(serializers.Serializer):
    visibility_state = _text()


class VueSerializer(serializers.Serializer):
    component_name = _text()
    lifecycle_hook = _text()
    parents = serializers.ListField(child=_text(), required=False)
    props = BoundedJSONField(required=False)


class FrontendContextsSerializer(serializers.Serializer):
    browser = VersionInfoSerializer(required=False)
    os = VersionInfoSerializer(required=False)
    device = DeviceSerializer(required=False)
    route = RouteSerializer(required=False, allow_null=True)
    app = AppSerializer(required=False)
    vue = VueSerializer(required=False)


class BreadcrumbSerializer(serializers.Serializer):
    type = _text()
    category = _text()
    message = _text()
    level = _text()
    data = BoundedJSONField(required=False)
    timestamp = FiniteFloatField()


class BreadcrumbsSerializer(serializers.Serializer):
    values = BreadcrumbSerializer(many=True, required=False)


class FrontendRequestSerializer(serializers.Serializer):
    url = _text()


class DeduplicationSerializer(serializers.Serializer):
    count = serializers.IntegerField(min_value=1)


class FrontendContextSerializer(EventSerializer):
    contexts = FrontendContextsSerializer(required=False)
    breadcrumbs = BreadcrumbsSerializer(required=False)
    request = FrontendRequestSerializer(required=False)
    deduplication = DeduplicationSerializer(required=False)


class BackendRequestSerializer(serializers.Serializer):
    url = _text()
    method = _text()
    headers = TextDictField(required=False)
    query_params = BoundedJSONField(required=False)
    body = BoundedJSONField(required=False, allow_null=True)


class ServerSerializer(serializers.Serializer):
    host = _text()
    port = _text()


class BackendContextSerializer(EventSerializer):
    contexts = RuntimeContextsSerializer(required=False)
    request = BackendRequestSerializer(required=False)
    server = ServerSerializer(required=False)
    packages = serializers.ListField(child=_text(), required=False)
    avg_request_time_to_error = FiniteFloatField(required=False)
    request_time_samples = serializers.IntegerField(required=False, min_value=0)


class JobInfoSerializer(serializers.Serializer):
    job_id = _text()
    func = _text()
    facility_id = _text()
    args = BoundedJSONField(required=False)
    kwargs = BoundedJSONField(required=False)
    progress = FiniteFloatField(required=False, allow_null=True)
    total_progress = FiniteFloatField(required=False, allow_null=True)
    extra_metadata = BoundedJSONField(required=False, allow_null=True)


class WorkerInfoSerializer(serializers.Serializer):
    worker_process = _text()
    worker_thread = _text()
    worker_extra = _text()


class TaskContextSerializer(EventSerializer):
    contexts = RuntimeContextsSerializer(required=False)
    job_info = JobInfoSerializer(required=False)
    worker_info = WorkerInfoSerializer(required=False)
    packages = serializers.ListField(child=_text(), required=False)


CONTEXT_SERIALIZERS = {
    FRONTEND: FrontendContextSerializer,
    BACKEND: BackendContextSerializer,
    TASK: TaskContextSerializer,
}
