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
        assert os.environ.get("GITHUB_JOB") != "nocext"
        if os.environ.get("GITHUB_JOB") == "cext":
            assert "dist/cext" in cryptography.__file__
    except ImportError:
        # This variable is defined by Github Actions and the intention is to fail
        # loudly when were unsuccessful when importing cryptography
        if os.environ.get("GITHUB_JOB") == "cext":
            raise AssertionError("Expected c extensions")


def test_cryptography_runs():
    """
    Checks that an imported version of cryptography is actually from the
    dist/cext folder. We can allow other versions, but for now, we want tests
    to fail until we identify the right way to do this.
    """
    if os.environ.get("GITHUB_JOB") == "cext":
        try:
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.backends import default_backend

            crypto_backend = default_backend()
            rsa.generate_private_key(
                public_exponent=65537, key_size=2048, backend=crypto_backend
            )

        except Exception:
            raise AssertionError("Cryptography could not run.")
