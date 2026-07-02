from morango.constants import transfer_stages

option_spec = {
    "Sync": {
        "BACKGROUND_INITIALIZATION": {
            "type": "boolean",
            "default": False,
            "envvars": ("KOLIBRI_SYNC_BACKGROUND_INITIALIZATION",),
        },
        "BACKGROUND_INITIALIZATION_STAGES": {
            "type": "string",
            "default": ",".join([transfer_stages.SERIALIZING, transfer_stages.QUEUING]),
            "envvars": ("KOLIBRI_SYNC_BACKGROUND_INITIALIZATION_STAGES",),
        },
        "BACKGROUND_FINALIZATION": {
            "type": "boolean",
            "default": False,
            "envvars": ("KOLIBRI_SYNC_BACKGROUND_FINALIZATION",),
        },
        "BACKGROUND_FINALIZATION_STAGES": {
            "type": "string",
            "default": ",".join(
                [
                    transfer_stages.DEQUEUING,
                    transfer_stages.DESERIALIZING,
                    transfer_stages.CLEANUP,
                ]
            ),
            "envvars": ("KOLIBRI_SYNC_BACKGROUND_FINALIZATION_STAGES",),
        },
    }
}
