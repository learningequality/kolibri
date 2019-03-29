import os


def test_cryptography_path():
    """
    Checks that an imported version of cryptography is actually from the
    dist/cext folder. We can allow other versions, but for now, we want tests
    to fail until we identify the right way to do this.
    """
    try:
        import cryptography

        # If this is 'n' and we can import cryptography, there is a problem
        assert os.environ.get("TOX_ENV") != "nocext"
        if os.environ.get("TOX_ENV") == "cext":
            assert "dist/cext" in cryptography.__file__
    except ImportError:
        # This variable is defined in .travis.yml and the intention is to fail
        # loudly when were unsuccessful when importing cryptography
        if os.environ.get("TOX_ENV") == "cext":
            raise AssertionError("Expected c extesions")
