from rest_framework import serializers

from .models import Shortcut
from kolibri.core.serializers import KolibriModelSerializer


class ShortcutSerializer(KolibriModelSerializer):
    extra_fields = serializers.JSONField(default="{}")

    class Meta:
        model = Shortcut
        fields = (
            "id",
            "user",
            "contentnode",
            "extra_fields",
        )
