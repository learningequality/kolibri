"""
Modified and extended from https://github.com/camsaul/django-rest-params/blob/master/django_rest_params/decorators.py
"""

import functools
import hashlib
import logging
import random
import re
import threading
import time
from copy import deepcopy
from io import BytesIO

from django.core.handlers.wsgi import WSGIRequest
from django.db import connections
from django.utils import translation
from django.utils.cache import add_never_cache_headers
from django.utils.cache import get_conditional_response
from django.utils.cache import patch_response_headers
from django.utils.text import compress_string
from rest_framework.exceptions import APIException
from rest_framework.views import APIView

from kolibri import __version__ as kolibri_version
from kolibri.core.utils.cache import process_cache

logger = logging.getLogger(__name__)

TRUE_VALUES = ("1", "true")
FALSE_VALUES = ("0", "false")

BOOL_PARTS = ("deferred", "optional", "many")
NUM_PARTS = ("gt", "gte", "lt", "lte", "eq")


class InvalidQueryParamsException(APIException):
    status_code = 400
    default_detail = "Params of the wrong type were passed on the request"
    default_code = "invalid_parameters"


class MissingRequiredParamsException(APIException):
    status_code = 412
    default_detail = "Required query parameters were missing from the request"
    default_code = "missing_parameters"


# Types that we'll all for as 'tuple' params
TUPLE_TYPES = tuple, set, frozenset, list
VALID_TYPES = int, float, str, bool


class ParamValidator:
    # the name of the param in the request, e.g. 'user_id' (even if we pass 'user' to the Fn)
    param_name = None

    # type
    param_type = None

    # method - explicitly allow a certain method. If both are false we'll use defaults
    allow_GET = False
    allow_POST = False

    # value validators
    gt = None
    gte = None
    lt = None
    lte = None
    eq = None

    # optional
    optional = False
    default = None

    # multiple vals
    many = False

    # django models only
    deferred = True
    field = "id"

    def __init__(self, arg_name):
        self.param_name = arg_name

    def check_tuple_type(self, param):
        if param not in self.param_type:
            raise InvalidQueryParamsException(
                'invalid option "%s": Must be one of: %s' % (param, self.param_type)
            )

    def check_non_tuple_types(self, param):
        if self.param_type == int:
            param = int(param)
        elif self.param_type == float:
            param = float(param)
        elif self.param_type == str:
            if not isinstance(param, str):
                raise AssertionError
        elif self.param_type == bool:
            param = str(param).lower()  # bool isn't case sensitive
            if param in TRUE_VALUES:
                param = True
            elif param in FALSE_VALUES:
                param = False
            else:
                raise InvalidQueryParamsException(
                    "%s is not a valid bool: must be one of: %s"
                    % (param, TRUE_VALUES + FALSE_VALUES)
                )
        elif hasattr(
            self.param_type, "_default_manager"
        ):  # isinstance(django.models.Model) doesn't seem to work, but this is a good tell
            query_set = self.param_type.objects
            if self.deferred:
                query_set = query_set.only("id")
            param = query_set.get(**{self.field: param})
        else:
            raise InvalidQueryParamsException(
                "Invalid param type: %s" % self.param_type.__name__
            )
        return param

    def check_type(self, param):
        """Check that the type of param is valid, or raise an Exception. This doesn't take self.many into account."""
        if isinstance(self.param_type, TUPLE_TYPES):
            self.check_tuple_type(param)
        else:
            param = self.check_non_tuple_types(param)
        return param

    def check_value(self, param):
        """Check that a single value is lt/gt/etc. Doesn't take self.many into account."""
        if self.param_type == int or self.param_type == float:
            self.check_value_constraints(param)
        elif self.param_type == str:
            self.check_value_constraints(len(param))
        return True

    def check_value_constraints(self, param):
        try:
            if self.eq and param != self.eq:
                raise InvalidQueryParamsException("must be equal to %s!" % self.eq)
            else:
                if self.lt and param >= self.lt:
                    raise InvalidQueryParamsException("must be less than %s!" % self.lt)
                if self.lte and param > self.lte:
                    raise InvalidQueryParamsException(
                        "must be less than or equal to %s!" % self.lte
                    )
                if self.gt and param <= self.gt:
                    raise InvalidQueryParamsException(
                        "must be greater than %s!" % self.gt
                    )
                if self.gte and param < self.gte:
                    raise InvalidQueryParamsException(
                        "must be greater than or equal to %s!" % self.gte
                    )
        except InvalidQueryParamsException as e:
            msg = str(e)
            msg = ("Length " if self.param_type == str else "Value ") + msg
            raise InvalidQueryParamsException(msg)

    def set_type(self, param_type):
        if not hasattr(param_type, "_default_manager"):  # django model
            if (
                not isinstance(param_type, TUPLE_TYPES)
                and param_type not in VALID_TYPES
            ):
                raise InvalidQueryParamsException(
                    "Invalid type for %s: %s is not a valid type"
                    % (self.param_name, param_type)
                )
        self.param_type = param_type

    def set_method(self, value):
        if isinstance(value, TUPLE_TYPES):
            for method in value:
                if method == "GET":
                    self.allow_GET = True
                elif method == "POST":
                    self.allow_POST = True
                else:
                    raise InvalidQueryParamsException(
                        'Invalid value for __method: "%s"' % method
                    )
        else:
            if value == "GET":
                self.allow_GET = True
            elif value == "POST":
                self.allow_POST = True
            else:
                raise InvalidQueryParamsException(
                    'Invalid value for __method: "%s"' % value
                )

    def set_constraints(self, suffix, value):
        if suffix == "method":
            self.set_method(value)
        elif suffix in BOOL_PARTS:
            if not isinstance(value, bool):
                raise AssertionError
            setattr(self, suffix, value)
        elif suffix in NUM_PARTS:
            if not (isinstance(value, int) or isinstance(value, float)):
                raise AssertionError
            setattr(self, suffix, value)
        elif suffix == "default":
            self.optional = True
            self.default = value

        elif suffix == "field":
            if not isinstance(suffix, str):
                raise AssertionError
            self.field = value
        else:
            raise InvalidQueryParamsException(
                "Invalid option: '__{suffix}' in param '{param_name}'".format(
                    suffix=suffix, param_name=self.param_name
                )
            )

    def validate(self, request):
        request_method = request.META["REQUEST_METHOD"]
        default_param_method = (
            "POST" if request_method == "POST" or request_method == "PUT" else "GET"
        )

        # what methods are allowed?
        use_default_methods = not self.allow_GET and not self.allow_POST
        allow_GET = (
            (default_param_method == "GET") if use_default_methods else self.allow_GET
        )
        allow_POST = (
            (default_param_method == "POST") if use_default_methods else self.allow_POST
        )

        # find the param
        param = None
        if allow_POST:
            param = request.DATA.get(self.param_name, None)
            param_type = "POST"
        if not param and allow_GET:
            param = request.GET.get(self.param_name, None)
            param_type = "GET"

        # optional/default
        if param is None:  # but not False, because that's a valid boolean param
            if not self.optional:
                raise MissingRequiredParamsException(self.param_name)
            else:
                return self.default

        # check type, value
        if self.many:
            if param_type == "GET":
                params = str(param).split(",")
            else:
                params = param if isinstance(param, list) else (param,)
            return [self.check_type(p) for p in params if self.check_value(p)]
        else:
            param = self.check_type(param)
            self.check_value(param)
            return param


def query_params_required(**kwargs):  # noqa: C901
    """
    Request fn decorator that builds up a list of params and automatically returns a 400 if they are invalid.
    The validated params are passed to the wrapped function as kwargs.
    """
    validators = {}

    for key, value in kwargs.items():
        parts = key.split("__")
        param_key = parts[0]

        if param_key not in validators:
            validators[param_key] = ParamValidator(param_key)
        validator = validators[param_key]

        if len(parts) == 1:
            # set type
            validator.set_type(value)
        else:
            # we only are interested in the last part, since the only thing that can be multipart is __length__eq (etc) and 'length' is not important
            suffix = parts[-1]
            validator.set_constraints(suffix, value)

    def _params(cls):
        if not issubclass(cls, APIView):
            raise AssertionError(
                "query_params_required decorator can only be used on subclasses of APIView"
            )

        def initial(self, request, *args, **kwargs):
            # Copy this from the default viewset initial behaviour, otherwise it is not set before a
            # validation exception would be raised.
            self.format_kwarg = self.get_format_suffix(**kwargs)
            neg = self.perform_content_negotiation(request)
            request.accepted_renderer, request.accepted_media_type = neg

            # Validate the params
            missing_params = []
            for arg_name, validator in validators.items():
                try:
                    kwargs[arg_name] = validator.validate(request)
                except MissingRequiredParamsException:
                    missing_params.append(validator.param_name)

            if missing_params:
                raise MissingRequiredParamsException(
                    "The following parameters were missing and are required: {required}".format(
                        required=", ".join(missing_params)
                    )
                )
            # Update the kwargs on the view itself
            self.kwargs = kwargs
            super(cls, self).initial(request, *args, **kwargs)

        setattr(cls, "initial", initial)

        return cls

    return _params


# Seconds a freshly stored body is served before a refresh is triggered.
BODY_CACHE_REFRESH = 15
# Refresh deadlines are jittered back by up to this much, so the bodies warming
# stores in one burst do not all come due in the same instant.
BODY_CACHE_REFRESH_JITTER = 5
# How long the refresh election is held before another request may take it over,
# in case the elected refresher dies mid-render.
BODY_CACHE_LOCK_TIMEOUT = 30


def _spawn(target):
    # Seam for the background refresh, so tests can run it synchronously.
    threading.Thread(target=target, daemon=True).start()


_GZIP_RE = re.compile(r"\bgzip\b")


def _accepts_gzip(request):
    # No Accept-Encoding means no preference, so it gets the gzip like everyone
    # else; only an explicit header without gzip gets the plain body. Mirrors the
    # negotiation kolibri.utils.kolibri_whitenoise does for static assets.
    accept_encoding = request.META.get("HTTP_ACCEPT_ENCODING", "*")
    return accept_encoding == "*" or bool(_GZIP_RE.search(accept_encoding))


# Carried from a live request into its off-thread refresh so the refreshed body
# matches what the request renders. Excludes cookies and other per-user headers -
# the cached body must stay user-independent.
_CARRIED_ENVIRON_KEYS = (
    "SERVER_NAME",
    "SERVER_PORT",
    "HTTP_HOST",
    "wsgi.url_scheme",
)


def _build_request(path, base_environ=None):
    # Bare GET request for rendering a cached view outside the request cycle.
    environ = {
        "REQUEST_METHOD": "GET",
        "PATH_INFO": path,
        "SCRIPT_NAME": "",
        "SERVER_NAME": "localhost",
        "SERVER_PORT": "80",
        "SERVER_PROTOCOL": "HTTP/1.1",
        "QUERY_STRING": "",
        "wsgi.url_scheme": "http",
        "wsgi.input": BytesIO(b""),
    }
    if base_environ is not None:
        for key in _CARRIED_ENVIRON_KEYS:
            if key in base_environ:
                environ[key] = base_environ[key]
    request = WSGIRequest(environ)
    # The decorator drops the session; give it one to drop.
    request.session = {}
    return request


class _CachedBody:
    """
    Serve one view's rendered body from a shared cross-process cache, since the
    view renders no user-specific data.
    """

    def __init__(self, view_class):
        self._view_class = view_class
        self._dispatch = view_class.dispatch

    def __call__(self, view, request, *args, **kwargs):
        # Drop the session so the session middleware does not add Vary: Cookie,
        # which would split the cache per user.
        del request.session
        body_key, lock_key = self._keys(request.path)
        entry = process_cache.get(body_key)
        if entry is not None:
            variants, refresh_at = entry
            if time.time() >= refresh_at and process_cache.add(
                lock_key, True, BODY_CACHE_LOCK_TIMEOUT
            ):
                self._refresh_in_background(request, body_key, lock_key)
            return self._conditional(request, self._pick(request, variants))
        # Cold miss: render inline, since there is nothing to serve stale.
        return self._conditional(
            request, self._render_and_store(view, request, args, kwargs, body_key)
        )

    @staticmethod
    def _keys(path):
        # One entry per path; language is carried by the path's i18n prefix.
        # The entry holds both encodings, so the key does not vary on
        # Accept-Encoding - it is negotiated at serve time instead.
        digest = hashlib.md5(
            "{}:{}".format(kolibri_version, path).encode("utf-8")
        ).hexdigest()
        return "VIEW_BODY_CACHE_{}".format(digest), "VIEW_BODY_LOCK_{}".format(digest)

    @staticmethod
    def _conditional(request, response):
        # Honour If-None-Match so a client past the browser-cache window
        # revalidates instead of re-fetching the whole body.
        return (
            get_conditional_response(
                request, etag=response.headers.get("ETag"), response=response
            )
            or response
        )

    @staticmethod
    def _pick(request, variants):
        plain, gzipped = variants
        return gzipped if _accepts_gzip(request) else plain

    @staticmethod
    def _finalize(response, content, encoding=None):
        response.content = content
        if encoding:
            response.headers["Content-Encoding"] = encoding
        response.headers["Content-Length"] = str(len(content))
        patch_response_headers(response, cache_timeout=BODY_CACHE_REFRESH)
        response.headers["Vary"] = "Accept-Encoding"
        # Content-based ETag, so conditional GETs 304. Distinct per encoding,
        # since the two representations are different bytes.
        response.headers["ETag"] = '"{}"'.format(
            hashlib.md5(kolibri_version.encode("utf-8") + content).hexdigest()
        )
        return response

    def _render_and_store(self, view, request, args, kwargs, body_key):
        response = self._dispatch(view, request, *args, **kwargs)
        if hasattr(response, "render") and callable(response.render):
            response.render()
        if response.status_code != 200 or not response.content:
            add_never_cache_headers(response)
            return response
        # Both encodings are compressed and stored once here rather than per
        # request - that drag is what retired the global gzip middleware.
        gzipped = self._finalize(
            deepcopy(response), compress_string(response.content), "gzip"
        )
        variants = (self._finalize(response, response.content), gzipped)
        refresh_at = (
            time.time()
            + BODY_CACHE_REFRESH
            - random.uniform(0, BODY_CACHE_REFRESH_JITTER)
        )
        # timeout=None: the body never hard-expires, so a stale copy is always
        # available to serve while one request refreshes it.
        process_cache.set(body_key, (variants, refresh_at), None)
        return self._pick(request, variants)

    def _refresh_in_background(self, request, body_key, lock_key):
        # Off-thread so no request blocks on the render. Build a fresh view and
        # request rather than sharing the live ones across threads - the view
        # renders from its own ``request`` attribute, so it needs its own view
        # instance. Translation is thread-local, so carry the language over.
        language = translation.get_language()
        path = request.path
        base_environ = {
            key: request.environ[key]
            for key in _CARRIED_ENVIRON_KEYS
            if key in request.environ
        }

        def run():
            try:
                with translation.override(language):
                    fresh_request = _build_request(path, base_environ)
                    fresh_view = self._view_class()
                    fresh_view.setup(fresh_request)
                    self._render_and_store(fresh_view, fresh_request, (), {}, body_key)
            # Best effort: a thread has no caller to propagate to, and a failed
            # refresh just means the stale body serves until the next attempt.
            except Exception:
                logger.warning("Failed to refresh cached view body", exc_info=True)
            finally:
                process_cache.delete(lock_key)
                connections.close_all()

        _spawn(run)


def cache_no_user_data(view_class):
    """
    View-class decorator: serve the view's body from a shared cache (see
    ``_SpaBodyCache``). Must not be used on a view that renders user data.
    """
    cache = _CachedBody(view_class)

    @functools.wraps(view_class.dispatch)
    def dispatch(self, request, *args, **kwargs):
        return cache(self, request, *args, **kwargs)

    view_class.dispatch = dispatch
    return view_class
