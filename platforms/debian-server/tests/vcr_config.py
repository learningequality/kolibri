"""VCR configuration for recording/replaying HTTP interactions."""

import vcr

my_vcr = vcr.VCR(
    cassette_library_dir="tests/cassettes",
    record_mode="new_episodes",
    path_transformer=vcr.VCR.ensure_suffix(".yaml"),
    filter_headers=["authorization"],
)
