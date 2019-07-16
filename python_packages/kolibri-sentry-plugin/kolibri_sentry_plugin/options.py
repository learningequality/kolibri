option_spec = {
    "Debug": {
        "SENTRY_BACKEND_DSN": {
            "type": "string",
            "envvars": ("KOLIBRI_DEBUG_SENTRY_BACKEND_DSN",),
        },
        "SENTRY_FRONTEND_DSN": {
            "type": "string",
            "envvars": ("KOLIBRI_DEBUG_SENTRY_FRONTEND_DSN",),
        },
        "SENTRY_ENVIRONMENT": {
            "type": "string",
            "envvars": ("KOLIBRI_DEBUG_SENTRY_ENVIRONMENT",),
        },
    },
}
