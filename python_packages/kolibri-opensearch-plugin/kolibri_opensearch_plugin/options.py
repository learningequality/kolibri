option_spec = {
    "OpenSearch": {
        "HOST_BASE_URL": {
            "type": "string",
            "default": "http://127.0.0.1:5002/oauth",
            "envvars": ("KOLIBRI_OIDC_CLIENT_URL",),
        }
    }
}
