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
    },
}
