option_spec = {
    "OIDCProvider": {
        "REQUIRE_CONSENT": {
            "type": "boolean",
            "default": True,
            "envvars": ("KOLIBRI_OIDC_PROVIDER_REQUEST_CONSENT",),
        }
    }
}
