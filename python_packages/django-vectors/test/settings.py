"""
Settings for the django-vectors test suite. The suite runs without Kolibri.
"""

SECRET_KEY = "django-vectors-tests"

INSTALLED_APPS = [
    "django_vectors",
    "testapp",
]

# The suite uses two aliases on purpose. The `default` alias is a plain SQLite
# backend, so code that reaches it compiles against a backend with no vector
# support, as in Kolibri. The `Query.__str__` method of Django always compiles
# against `default`, whatever the router returns. A harness with one alias hides bugs
# of that type.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    },
    "vectors": {
        "ENGINE": "django_vectors.db.backends.sqlite3",
        "NAME": ":memory:",
    },
}

DATABASE_ROUTERS = ["testapp.routers.VectorRouter"]

USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
