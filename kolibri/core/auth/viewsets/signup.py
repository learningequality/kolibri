import logging

from django.contrib.auth import authenticate
from django.contrib.auth import login
from django.core.exceptions import PermissionDenied
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework import viewsets
from rest_framework.mixins import CreateModelMixin
from rest_framework.response import Response

from .facility_user import FacilityUserSerializer

logger = logging.getLogger(__name__)


class BaseSignUpViewSet(viewsets.GenericViewSet, CreateModelMixin):
    def get_serializer_class(self):
        return FacilityUserSerializer

    def check_can_signup(self, serializer):
        facility = serializer.validated_data["facility"]
        if (
            not facility.dataset.learner_can_sign_up
            or not facility.dataset.full_facility_import
        ):
            raise PermissionDenied("Cannot sign up to this facility")

    def perform_create(self, serializer):
        self.check_can_signup(serializer)
        serializer.save()
        data = serializer.validated_data
        authenticated_user = authenticate(
            username=data["username"],
            password=data["password"],
            facility=data["facility"],
        )
        login(self.request, authenticated_user)


@method_decorator(csrf_protect, name="dispatch")
class SignUpViewSet(BaseSignUpViewSet):
    pass


@method_decorator(csrf_exempt, name="dispatch")
class PublicSignUpViewSet(BaseSignUpViewSet):
    # Does not log in the user. Supports legacy_serializer_classes for API stability.
    legacy_serializer_classes = []

    def create(self, request, *args, **kwargs):
        exception = None
        serializer_kwargs = dict(data=request.data)
        serializer_kwargs.setdefault("context", self.get_serializer_context())
        for serializer_class in [
            self.get_serializer_class()
        ] + self.legacy_serializer_classes:
            serializer = serializer_class(**serializer_kwargs)
            try:
                serializer.is_valid(raise_exception=True)
                break
            except Exception as e:
                exception = e
        if exception:
            raise exception
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def perform_create(self, serializer):
        self.check_can_signup(serializer)
        serializer.save()
