import pytest

try:
    import vcr

    my_vcr = vcr.VCR(
        cassette_library_dir="tests/cassettes",
        record_mode="new_episodes",
        path_transformer=vcr.VCR.ensure_suffix(".yaml"),
        filter_headers=["authorization"],
    )
except ImportError:

    class VCR:
        def use_cassette(self, *args, **kwargs):
            return pytest.mark.skip("vcrpy is not available on this Python version")

    my_vcr = VCR()
