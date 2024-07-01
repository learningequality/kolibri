context_frontend_schema = {
    "type": "object",
    "properties": {
        "browser": {"type": "string"},
        "component": {"type": "string", "optional": True},
        "device": {
            "type": "object",
            "properties": {
                "type": {"type": "string"},  # "desktop", "tablet", "mobile"
                "platform": {
                    "type": "string",
                    "optional": True,
                },  # "windows", "mac", "linux", "android", "ios"
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
default_context_frontend_schema = {"browser": "", "component": "N/A", "device": {}}
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
