import logging
import time
from datetime import timedelta
from uuid import UUID
from uuid import uuid4

from django.contrib.auth import authenticate
from django.contrib.auth import login
from django.contrib.auth import logout
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.utils.decorators import method_decorator
from django.utils.timezone import now
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import serializers
from rest_framework import status
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError as RestValidationError
from rest_framework.response import Response

from kolibri.core import error_constants
from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.device.utils import allow_other_browsers_to_connect
from kolibri.core.device.utils import APP_AUTH_TOKEN_COOKIE_NAME
from kolibri.core.device.utils import valid_app_key_on_request
from kolibri.core.logger.models import UserSessionLog
from kolibri.core.serializers import HexOnlyUUIDField
from kolibri.core.utils.token_generator import TokenGenerator

from ..models import Facility
from ..models import FacilityUser

logger = logging.getLogger(__name__)


class CreateSessionSerializer(serializers.Serializer):
    # allow_blank so that picture-password requests can omit username entirely
    username = serializers.CharField(required=False, default=None, allow_blank=True)
    user_id = HexOnlyUUIDField(required=False, default=None)
    password = serializers.CharField(
        default="",
        write_only=True,
        required=False,
        allow_blank=True,
    )
    facility = serializers.PrimaryKeyRelatedField(
        queryset=Facility.objects.all(),
        default=Facility.get_default_facility,
        required=False,
    )
    auth_token = serializers.CharField(required=False, default=None)
    picture_password = serializers.CharField(
        required=False,
        default=None,
        allow_null=True,
        allow_blank=False,
        # Format is exactly three dot-separated integers, each 1–2 digits
        # (icon indices 0–99), e.g. "3.7.12". min/max_length are a fast
        # pre-check; the regex is the authoritative format constraint.
        min_length=5,
        max_length=8,
        validators=[
            RegexValidator(
                r"^\d{1,2}\.\d{1,2}\.\d{1,2}$",
                message="picture_password must be three dot-separated integers.",
            )
        ],
    )

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")
        facility = attrs.get("facility")
        user_id = attrs.get("user_id")
        auth_token = attrs.get("auth_token")
        picture_password = attrs.get("picture_password")

        request = self.context.get("request")

        user = None

        # OS User authentication
        if valid_app_key_on_request(request):
            # If we are in app context, then try to get the automatically created OS User
            # if it matches the username, without needing a password.
            user = self._check_os_user(request, username)

        # user_id/auth_token authentication
        if user is None and user_id and auth_token:
            if TokenGenerator().check_token(user_id, auth_token):
                user = FacilityUser.objects.filter(
                    id=user_id, facility=facility
                ).first()

        # picture password authentication
        if user is None and picture_password is not None:
            user = authenticate(
                request, picture_password=picture_password, facility=facility
            )

        # username/password authentication — intentionally skipped when
        # picture_password was supplied (even if picture-password auth failed),
        # so a failed picture-password attempt cannot fall through to a
        # username/password login with whatever credentials were also sent.
        if user is None and picture_password is None:
            user = authenticate(
                request, username=username, password=password, facility=facility
            )

        if user is not None and user.is_active:
            attrs["user"] = user
            return attrs

        # Otherwise, throw a meaningful validation error
        self._throw_validation_error(username, password, facility, picture_password)

    def _check_os_user(self, request, username):
        app_auth_token = request.COOKIES.get(APP_AUTH_TOKEN_COOKIE_NAME)
        if app_auth_token:
            try:
                user = FacilityUser.objects.get_or_create_os_user(app_auth_token)
                if user is not None and user.username == username:
                    return user
            except ValidationError as e:
                logger.error(e)

    def _throw_validation_error(
        self, username, password, facility, picture_password=None
    ):
        if picture_password is not None:
            raise RestValidationError(
                detail={
                    "picture_password": [
                        {
                            "id": error_constants.NOT_FOUND,
                            "metadata": {
                                "field": "picture_password",
                                "message": "No learner found with that picture password.",
                            },
                        }
                    ]
                }
            )
        # Find the FacilityUser we're looking for
        try:
            unauthenticated_user = FacilityUser.objects.get(
                username__iexact=username, facility=facility
            )
        except (ValueError, ObjectDoesNotExist):
            raise RestValidationError(
                detail={
                    "username": [
                        {
                            "id": error_constants.NOT_FOUND,
                            "metadata": {
                                "field": "username",
                                "message": "Username not found.",
                            },
                        }
                    ]
                }
            )
        except FacilityUser.MultipleObjectsReturned:
            # Handle case of multiple matching usernames
            unauthenticated_user = FacilityUser.objects.filter(
                username__exact=username, facility=facility
            ).first()

        if unauthenticated_user.password == NOT_SPECIFIED and not hasattr(
            unauthenticated_user, "os_user"
        ):
            # Here - we have a Learner whose password is "NOT_SPECIFIED" because they were created
            # while the "Require learners to log in with password" setting was disabled - but now
            # it is enabled again.
            # Alternatively, they may have been created as an OSUser for automatic login with an
            # authentication token. If this is the case, then we do not allow for the password to be set.
            raise RestValidationError(
                detail={
                    "password": [
                        {
                            "id": error_constants.PASSWORD_NOT_SPECIFIED,
                            "metadata": {
                                "field": "password",
                                "message": "Username is valid, but password needs to be set before login.",
                            },
                        }
                    ]
                }
            )

        if not password:
            # Password was missing, but username is valid, prompt to give password
            raise RestValidationError(
                detail={
                    "password": [
                        {
                            "id": error_constants.MISSING_PASSWORD,
                            "metadata": {
                                "field": "password",
                                "message": "Username is valid, but password is missing.",
                            },
                        }
                    ]
                }
            )

        # If no other error message was raised, then throw a generic invalid credentials message
        raise RestValidationError(
            detail={
                "non_field_errors": [
                    {
                        "id": error_constants.INVALID_CREDENTIALS,
                        "metadata": {},
                    }
                ]
            }
        )


@method_decorator([ensure_csrf_cookie], name="dispatch")
class SessionViewSet(viewsets.ViewSet):
    def create(self, request):
        # Only enforce this when running in an app
        if not allow_other_browsers_to_connect() and not valid_app_key_on_request(
            request
        ):
            return Response(
                [{"id": error_constants.INVALID_CREDENTIALS, "metadata": {}}],
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = CreateSessionSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            if request.query_params.get("prevalidate") == "true":
                return Response({"full_name": user.full_name})
            login(request, user)
            return self.get_session_response(request)

        errors = serializer.errors
        return self._get_error_response(errors)

    def _get_error_response(self, errors):
        error_list = []
        response_status = status.HTTP_400_BAD_REQUEST
        for field, field_errors in errors.items():
            for error in field_errors:
                error_list.append(error)
                if (
                    isinstance(error, dict)
                    and error.get("id") == error_constants.INVALID_CREDENTIALS
                ):
                    response_status = status.HTTP_401_UNAUTHORIZED

        return Response(error_list, status=response_status)

    def destroy(self, request, pk=None):
        logout(request)
        return Response([])

    def update(self, request, pk=None):
        return self.get_session_response(request)

    def get_session_response(self, request):
        user = request.user
        session_key = "current"
        server_time = now()
        session = user.session_data
        session.update(
            {
                "id": session_key,
                "server_time": server_time,
                "app_context": valid_app_key_on_request(request),
            }
        )

        visitor_cookie_expiry = server_time + timedelta(days=365)

        if isinstance(user, AnonymousUser):
            response = Response(session)
            try:
                visitor_id = request.COOKIES.get("visitor_id")
                visitor_id = UUID(visitor_id, version=4).hex
            except (ValueError, TypeError):
                visitor_id = uuid4().hex
            response.set_cookie("visitor_id", visitor_id, expires=visitor_cookie_expiry)
            return response
        # Set last activity on session to the current time to prevent session timeout
        # Only do this for logged in users, as anonymous users cannot get logged out!
        request.session["last_session_request"] = int(time.time())
        # Default to active, only assume not active when explicitly set.
        active = request.data.get("active", False)

        # Can only record user session log data for FacilityUsers.
        if active and isinstance(user, FacilityUser):
            UserSessionLog.update_log(
                user,
                os_info=request.data.get("os"),
                browser_info=request.data.get("browser"),
            )

        response = Response(session)
        return response
