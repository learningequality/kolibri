from __future__ import absolute_import, print_function, unicode_literals
from django.views.generic.base import TemplateView


class UserView(TemplateView):
    template_name = "user/user.html"
