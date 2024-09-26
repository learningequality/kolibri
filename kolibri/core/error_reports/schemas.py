from .constants import BACKEND
from .constants import FRONTEND
from .constants import TASK


context_frontend_schema = {
    "type": "object",
    "definitions": {
        "versionInfo": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "optional": True},
                "major": {"type": "string", "optional": True},
                "minor": {"type": "string", "optional": True},
                "patch": {"type": "string", "optional": True},
            },
        }
    },
    "properties": {
        "browser": {
            "$ref": "#/definitions/versionInfo",
        },
        "component": {"type": "string", "optional": True},
        "os": {
            "$ref": "#/definitions/versionInfo",
        },
        "device": {
            "type": "object",
            "properties": {
                "model": {"type": "string", "optional": True},
                "type": {"type": "string", "optional": True},
                "vendor": {"type": "string", "optional": True},
                "is_touch_device": {"type": "boolean", "optional": True},
                "screen": {
                    "type": "object",
                    "properties": {
                        "width": {"type": "integer", "optional": True},
                        "height": {"type": "integer", "optional": True},
                        "available_width": {"type": "integer", "optional": True},
                        "available_height": {"type": "integer", "optional": True},
                    },
                },
            },
        },
    },
}
context_backend_schema = {
    "type": "object",
    "properties": {
        "request_info": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "optional": True},
                "method": {"type": "string", "optional": True},
                "headers": {"type": "object", "optional": True},
                "body": {"type": "string", "optional": True},
                "query_params": {"type": "object", "optional": True},
            },
        },
        "server": {
            "type": "object",
            "properties": {
                "host": {"type": "string", "optional": True},
                "port": {"type": "string", "optional": True},
            },
        },
        "packages": {"type": "array", "optional": True},
        "python_version": {"type": "string", "optional": True},
        "avg_request_time_to_error": {"type": "number", "optional": True},
    },
}

context_task_schema = {
    "type": "object",
    "properties": {
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
        },
        "worker_info": {
            "type": "object",
            "properties": {
                "worker_host": {"type": ["string", "null"], "optional": True},
                "worker_process": {"type": ["string", "null"], "optional": True},
                "worker_thread": {"type": ["string", "null"], "optional": True},
                "worker_extra": {"type": ["string", "null"], "optional": True},
            },
        },
        "packages": {"type": "array", "optional": True},
        "python_version": {"type": "string", "optional": True},
    },
}


SCHEMA_MAP = {
    FRONTEND: context_frontend_schema,
    BACKEND: context_backend_schema,
    TASK: context_task_schema,
}
