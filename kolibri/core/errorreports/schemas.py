context_frontend_schema = {
    "type": "object",
    "properties": {
        "browser": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "optional": True},
                "major": {"type": "string", "optional": True},
                "minor": {"type": "string", "optional": True},
                "patch": {"type": "string", "optional": True},
            },
        },
        "component": {"type": "string", "optional": True},
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
default_context_frontend_schema = {"browser": {}, "component": "", "device": {}}
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
    "request_info": {},
    "server": {},
    "packages": {},
    "python_version": "",
}
