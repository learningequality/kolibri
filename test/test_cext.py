import os


def test_cryptography_path():
    """
    Checks that an imported version of cryptography is actually from the
    dist/cext folder. We can allow other versions, but for now, we want tests
    to fail until we identify the right way to do this.
    """
    try:
        import cryptography
        assert "dist/cext" in cryptography.__file__
    except ImportError:
        # This variable is defined in .travis.yml and the intention is to fail
        # loudly when were unsuccessful when importing cryptography
        if os.environ.get('RUN_WITH_CEXT') == 'y':
            raise AssertionError("Expected c extesions")
