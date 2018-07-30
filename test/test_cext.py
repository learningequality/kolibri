

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
        pass
