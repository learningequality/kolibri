"""
Modified and extended from https://github.com/camsaul/django-rest-params/blob/master/django_rest_params/decorators.py
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import hashlib
import sys

from django.utils.cache import patch_response_headers
from django.views.decorators.http import etag
from rest_framework.exceptions import APIException
from rest_framework.views import APIView
from six import string_types

from kolibri import __version__ as kolibri_version
from kolibri.core.device.models import ContentCacheKey
from kolibri.core.theme_hook import ThemeHook

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
if sys.version_info > (3, 0):
    VALID_TYPES = int, float, str, bool
else:
    VALID_TYPES = int, float, str, unicode, bool  # noqa F821


class ParamValidator(object):
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
            assert isinstance(param, string_types)
        elif self.param_type == bool:
            param = str(param).lower()  # bool isn't case sensitive
            if param in TRUE_VALUES:
                param = True
            elif param in FALSE_VALUES:
                param = False
            else:
                raise InvalidQueryParamsException(
                    "%s is not a valid bool: must be one of: %s",
                    param,
                    TRUE_VALUES + FALSE_VALUES,
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
                "Invalid param type: %s" % self.param_type.____name__
            )
        return param

    def check_type(self, param):
        """ Check that the type of param is valid, or raise an Exception. This doesn't take self.many into account. """
        if isinstance(self.param_type, TUPLE_TYPES):
            self.check_tuple_type(param)
        else:
            param = self.check_non_tuple_types(param)
        return param

    def check_value(self, param):
        """ Check that a single value is lt/gt/etc. Doesn't take self.many into account. """
        if self.param_type == int or self.param_type == float:
            self.check_value_constraints(param)
        elif self.param_type == str:
            self.check_value_constraints(len(param))
        return True

    def check_value_constraints(self, param):
        try:
            if self.eq and param != self.eq:
                raise InvalidQueryParamsException("must be less than %s!" % self.eq)
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
            assert isinstance(value, bool)
            setattr(self, suffix, value)
        elif suffix in NUM_PARTS:
            assert isinstance(value, int) or isinstance(value, float)
            setattr(self, suffix, value)
        elif suffix == "default":
            self.optional = True
            self.default = value

        elif suffix == "field":
            assert isinstance(suffix, str)
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


def query_params_required(**kwargs):
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

        assert issubclass(
            cls, APIView
        ), "query_params_required decorator can only be used on subclasses of APIView"

        class Wrapper(cls):
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
                super(Wrapper, self).initial(request, *args, **kwargs)

        return Wrapper

    return _params


def calculate_spa_etag(*args, **kwargs):
    return hashlib.md5(
        kolibri_version.encode("utf-8")
        + str(ContentCacheKey.get_cache_key()).encode("utf-8")
        + str(ThemeHook.cacheKey()).encode("utf-8")
    ).hexdigest()


def cache_no_user_data(view_func):
    """
    Set appropriate Vary on headers on a view that specify there is
    no user specific data being rendered in the view.
    In order to ensure that the correct Vary headers are set,
    the session is deleted from the request, as otherwise Vary cookies
    will always be set by the Django session middleware.
    This should not be used on any view that bootstraps user specific
    data into it - this will remove the headers that will make this vary
    on a per user basis.
    """

    @etag(calculate_spa_etag)
    def inner_func(*args, **kwargs):
        request = args[0]
        del request.session
        response = view_func(*args, **kwargs)
        patch_response_headers(response, cache_timeout=15)
        response["Vary"] = "accept-encoding, accept"
        return response

    return inner_func
