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
                        "width": {"type": "integer"},
                        "height": {"type": "integer"},
                    },
                },
            },
        },
    },
}
default_version_info = {"name": "", "major": "", "minor": "", "patch": ""}
default_context_frontend_schema = {
    "browser": default_version_info,
    "component": "",
    "os": default_version_info,
    "device": {
        "model": "",
        "type": "",
        "vendor": "",
        "is_touch_device": False,
        "screen": {
            "width": 0,
            "height": 0,
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
            },
        },
        "server": {
            "type": "object",
            "properties": {
                "host": {"type": "string", "optional": True},
                "port": {"type": "integer", "optional": True},
            },
        },
        "packages": {"type": "object", "optional": True},
        "python_version": {"type": "string", "optional": True},
    },
}
default_context_backend_schema = {
    "request_info": {
        "url": "",
        "method": "",
        "headers": {},
        "body": "",
    },
    "server": {"host": "", "port": 0},
    "packages": {},
    "python_version": "",
}
