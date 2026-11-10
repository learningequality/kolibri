# django-vectors

django-vectors is a Django app for the storage of embeddings and K-nearest-neighbor (KNN) search on SQLite. It uses the [`sqlite-vec`](https://github.com/asg017/sqlite-vec) extension.

## Relation to Kolibri

django-vectors is a plain Django app, not a Kolibri plugin. It does not import Kolibri code, and `test/test_packaging.py` makes sure that it does not. Its only runtime dependency is Django. The `sqlite-vec` PyPI package is a test dependency only.

## Python and Django versions

- The supported Python versions are the versions in `requires-python` that are not end-of-life.
- `requires-python` matches Kolibri.
- End-of-life Python versions are not supported, but changes must not break them. CI runs the full test suite on all versions in `requires-python`.
- Django is pinned to the same version as Kolibri.
- Django 3.2 imports the `cgi` module, which Python 3.13 removed. If you use the package outside Kolibri on Python 3.13 or later, install a replacement such as [`legacy-cgi`](https://pypi.org/project/legacy-cgi/). Kolibri has its own replacement, and the test dependencies include `legacy-cgi`.

## Run the tests

1. Go to `python_packages/django-vectors/` in the Kolibri repository.
2. Run `uv run --isolated pytest`.

Do not run `uv sync` from `python_packages/django-vectors/` against the shared workspace environment. The command installs only this package, and it removes the dependencies of Kolibri from that environment.

## Test harness

`test/settings.py` defines two database aliases:

- `default` is a plain SQLite backend with no vector support. The `default` database of Kolibri has no vector support either.
- `vectors` uses the SQLite backend of the library, `django_vectors.db.backends.sqlite3`.

Django compiles `str(queryset.query)` against `default`, whatever the router returns. Code that compiles a query without an alias therefore gets a backend with no vector support. A test suite with one alias cannot find bugs of that type.

`test/testapp/routers.py` puts an explicit list of fixture models on `vectors`. Because the list is explicit, a test model can be on a different alias. The fixture models are in `test/testapp/models.py`.
