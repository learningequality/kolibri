option_spec = {
    "ErrorReports": {
        "SUBMISSION_RATE": {
            "type": "throttle_rate",
            "default": "100/min",
            "description": "Maximum frontend error reports accepted per client address, as a Django REST Framework throttle rate (for example `100/min`).",
        },
    },
}
