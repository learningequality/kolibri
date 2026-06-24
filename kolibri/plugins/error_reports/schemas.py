from .constants import BACKEND
from .constants import FRONTEND
from .constants import TASK

# Every category submits a Sentry-event-shaped context, so the telemetry
# server can re-report it into Sentry with minimal mapping. The schemas below
# validate that shape. They are validated by kolibri.core.utils.validators
# with the json_schema_validator library, which implements JSON Schema
# draft-03: properties are REQUIRED by default, and "optional": True (dropped
# in later drafts) is what makes a property optional. Additional properties
# are permitted (the draft-03 default), so unmodelled Sentry fields do not
# cause a report to be rejected.

_version_info = {
    "type": "object",
    "properties": {
        "name": {"type": ["string", "null"], "optional": True},
        "version": {"type": ["string", "null"], "optional": True},
    },
    "optional": True,
}

_stack_frame = {
    "type": "object",
    "properties": {
        "filename": {"type": ["string", "null"], "optional": True},
        "abs_path": {"type": ["string", "null"], "optional": True},
        "function": {"type": ["string", "null"], "optional": True},
        "lineno": {"type": ["integer", "null"], "optional": True},
        "colno": {"type": ["integer", "null"], "optional": True},
        "in_app": {"type": "boolean", "optional": True},
    },
}

# The Sentry exception interface, shared by every category. The exception
# type and value, and the stack signature, are the report's dedup identity.
_exception = {
    "type": "object",
    "properties": {
        "values": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": ["string", "null"], "optional": True},
                    "value": {"type": ["string", "null"], "optional": True},
                    "mechanism": {
                        "type": "object",
                        "properties": {
                            # How the error was captured: onerror,
                            # onunhandledrejection, vue, django, task...
                            "type": {"type": "string", "optional": True},
                            "handled": {"type": "boolean", "optional": True},
                        },
                        "optional": True,
                    },
                    "stacktrace": {
                        "type": "object",
                        "properties": {
                            "frames": {
                                "type": "array",
                                "items": _stack_frame,
                                "optional": True,
                            },
                        },
                        "optional": True,
                    },
                },
            },
            "optional": True,
        },
    },
    "optional": True,
}

# The Sentry contexts.runtime block, for the Python backend and task paths.
_runtime_contexts = {
    "type": "object",
    "properties": {
        "runtime": _version_info,
    },
    "optional": True,
}

# Common Sentry event fields present for every category.
_platform = {"type": "string", "optional": True}
_level = {"type": "string", "optional": True}
_traceback = {"type": ["string", "null"], "optional": True}
_packages = {"type": "array", "optional": True}

# The Sentry event envelope every category shares, spread into each schema's
# properties below so the shape is stated once.
_common_event_properties = {
    "platform": _platform,
    "level": _level,
    "exception": _exception,
    "traceback": _traceback,
}

context_frontend_schema = {
    "type": "object",
    "properties": {
        **_common_event_properties,
        "contexts": {
            "type": "object",
            "properties": {
                "browser": _version_info,
                "os": _version_info,
                "device": {
                    "type": "object",
                    "properties": {
                        "model": {"type": ["string", "null"], "optional": True},
                        "type": {"type": ["string", "null"], "optional": True},
                        "vendor": {"type": ["string", "null"], "optional": True},
                        "is_touch_device": {"type": "boolean", "optional": True},
                        "screen_breakpoint": {
                            "type": "number",
                            "minimum": 0,
                            "optional": True,
                        },
                    },
                    "optional": True,
                },
                "route": {
                    "type": ["object", "null"],
                    "properties": {
                        "name": {"type": ["string", "null"], "optional": True},
                        "path": {"type": "string", "optional": True},
                        "params": {"type": "object", "optional": True},
                    },
                    "optional": True,
                },
                "app": {
                    "type": "object",
                    "properties": {
                        "visibility_state": {"type": "string", "optional": True},
                    },
                    "optional": True,
                },
                "vue": {
                    "type": "object",
                    "properties": {
                        "component_name": {"type": "string", "optional": True},
                        "parents": {"type": "array", "optional": True},
                        "props": {"type": "object", "optional": True},
                    },
                    "optional": True,
                },
            },
            "optional": True,
        },
        "breadcrumbs": {
            "type": "object",
            "properties": {
                "values": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "optional": True},
                            "category": {"type": "string", "optional": True},
                            "message": {"type": "string", "optional": True},
                            "level": {"type": "string", "optional": True},
                            "data": {"type": "object", "optional": True},
                            # Epoch seconds from the device clock (Sentry's
                            # breadcrumb timestamp convention)
                            "timestamp": {"type": "number"},
                        },
                    },
                    "optional": True,
                },
            },
            "optional": True,
        },
        "request": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "optional": True},
            },
            "optional": True,
        },
    },
}

context_backend_schema = {
    "type": "object",
    "properties": {
        **_common_event_properties,
        "contexts": _runtime_contexts,
        "request": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "optional": True},
                "method": {"type": "string", "optional": True},
                "headers": {"type": "object", "optional": True},
                "body": {
                    "type": ["string", "object", "array", "null"],
                    "optional": True,
                },
                "query_params": {"type": "object", "optional": True},
            },
            "optional": True,
        },
        "server": {
            "type": "object",
            "properties": {
                "host": {"type": "string", "optional": True},
                "port": {"type": "string", "optional": True},
            },
            "optional": True,
        },
        "packages": _packages,
        "avg_request_time_to_error": {"type": "number", "optional": True},
        # The number of occurrences the running average above is computed over
        "request_time_samples": {"type": "integer", "optional": True},
    },
}

context_task_schema = {
    "type": "object",
    "properties": {
        **_common_event_properties,
        "contexts": _runtime_contexts,
        "job_info": {
            "type": "object",
            "properties": {
                "job_id": {"type": "string", "optional": True},
                "func": {"type": "string", "optional": True},
                "facility_id": {"type": ["string", "null"], "optional": True},
                "args": {"type": "array", "optional": True},
                "kwargs": {"type": "object", "optional": True},
                "progress": {"type": "integer", "optional": True},
                "total_progress": {"type": "integer", "optional": True},
                "extra_metadata": {"type": "object", "optional": True},
            },
            "optional": True,
        },
        "worker_info": {
            "type": "object",
            "properties": {
                "worker_host": {"type": ["string", "null"], "optional": True},
                "worker_process": {"type": ["string", "null"], "optional": True},
                "worker_thread": {"type": ["string", "null"], "optional": True},
                "worker_extra": {"type": ["string", "null"], "optional": True},
            },
            "optional": True,
        },
        "packages": _packages,
    },
}


SCHEMA_MAP = {
    FRONTEND: context_frontend_schema,
    BACKEND: context_backend_schema,
    TASK: context_task_schema,
}
