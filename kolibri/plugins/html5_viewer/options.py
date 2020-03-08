# Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
allowable_sandbox_tokens = set(
    [
        "allow-downloads-without-user-activation",
        "allow-forms",
        "allow-modals",
        "allow-orientation-lock",
        "allow-pointer-lock",
        "allow-popups",
        "allow-popups-to-escape-sandbox",
        "allow-presentation",
        "allow-same-origin",
        "allow-scripts",
        "allow-storage-access-by-user-activation ",
        "allow-top-navigation",
        "allow-top-navigation-by-user-activation",
    ]
)


def clean_sandbox(sandbox_string):
    """
    Clean up sandbox string to ensure it only contains valid items.
    """
    sandbox_tokens = [
        token
        for token in sandbox_string.split(" ")
        if token in allowable_sandbox_tokens
    ]
    return " ".join(sandbox_tokens)


option_spec = {
    "HTML5": {
        "SANDBOX": {
            "type": "string",
            "default": "allow-scripts",
            "envvars": ("KOLIBRI_HTML5_SANDBOX",),
            "clean": clean_sandbox,
        }
    }
}
