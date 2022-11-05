from functools import wraps

try:
    from drf_yasg import openapi
    from drf_yasg.utils import swagger_auto_schema
except (ImportError, NameError):
    swagger_auto_schema = None
    openapi = None


def swagger_auto_schema_available(params):
    """
    Decorator to be able to use drf_yasg's swagger_auto_schema only if it is installed.
    This will allow defining schemas to be used in dev mode with http://localhost:8000/api_explorer/
    while not breaking the app if drf_yasg is not installed (in production mode)

    :param list[tuples] params: list of the params the function accepts
    :return: decorator


    It has to be used with this syntax:
    @swagger_auto_schema_available([(param1_name, param1_description, param1_type), (param2_name...)])

    param_type must be one of the defined in the drf_yasg.openapi:
    TYPE_OBJECT = "object"  #:
    TYPE_STRING = "string"  #:
    TYPE_NUMBER = "number"  #:
    TYPE_INTEGER = "integer"  #:
    TYPE_BOOLEAN = "boolean"  #:
    TYPE_ARRAY = "array"  #:
    TYPE_FILE = "file"  #:

    example:
    class PathPermissionView(views.APIView):

        @swagger_auto_schema_available([("path", "path to check permissions for", "string")])
        def get(self, request):
    """

    def inner(func):
        if swagger_auto_schema:
            if func.__name__ == "get":
                manual_parameters = []
                for param in params:
                    manual_parameters.append(
                        openapi.Parameter(
                            param[0],
                            openapi.IN_QUERY,
                            description=param[1],
                            type=param[2],
                        )
                    )
                swagger_auto_schema(manual_parameters=manual_parameters)(func)
            else:  # PUT,PATCH,POST,DELETE
                properties = {}
                for param in params:
                    properties[param[0]] = openapi.Schema(
                        type=param[2], description=param[1]
                    )
                swagger_auto_schema(
                    request_body=openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties=properties,
                    ),
                )(func)

        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        return wrapper

    return inner
