from __future__ import absolute_import, print_function, unicode_literals

from django.core.urlresolvers import reverse
from django.http import HttpResponse
from django.views.generic.base import TemplateView
from kolibri.auth.models import DeviceOwner
from rest_framework import viewsets


class DeviceOwnerCreateView(TemplateView):
    template_name = "setup_wizard/setup_wizard.html"

class DeviceOwnerCreateViewSet(viewsets.ViewSet):

    def list(self, request):
        username = request.GET['username']
        password = request.GET['password']
        d = DeviceOwner(username=username)
        d.set_password(password)
        d.save()
        redirect_path = request.get_host() + reverse("kolibri:learnplugin:learn")
        return HttpResponse(redirect_path)
