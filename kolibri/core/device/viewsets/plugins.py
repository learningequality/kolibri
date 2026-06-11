from django.http import Http404
from django.utils.translation import get_language
from rest_framework import viewsets
from rest_framework.response import Response

from kolibri.core.device.permissions import IsSuperuser
from kolibri.plugins.utils import initialize_kolibri_plugin
from kolibri.plugins.utils import iterate_plugins
from kolibri.plugins.utils import PluginDoesNotExist


class PluginsViewSet(viewsets.ViewSet):
    permission_classes = (IsSuperuser,)

    def _serialize(self, plugin):
        return {
            "name": plugin.name(get_language()),
            "id": plugin.module_path.replace(".", "*"),
            "enabled": plugin.enabled,
        }

    def list(self, request):
        return Response(
            [
                self._serialize(plugin)
                for plugin in iterate_plugins()
                if plugin.can_manage_while_running
            ]
        )

    def _retrieve_plugin(self, pk):
        if not pk:
            raise Http404
        try:
            plugin = initialize_kolibri_plugin(pk.replace("*", "."))
            if not plugin.can_manage_while_running:
                raise Http404
            return plugin
        except PluginDoesNotExist:
            raise Http404

    def retrieve(self, request, pk):
        return Response(self._serialize(self._retrieve_plugin(pk)))

    def partial_update(self, request, pk=None):
        plugin = self._retrieve_plugin(pk)
        enabled = request.data.get("enabled")
        if enabled is not None:
            if enabled and not plugin.enabled:
                plugin.enable()
            elif not enabled and plugin.enabled:
                plugin.disable()
        return Response(self._serialize(plugin))
