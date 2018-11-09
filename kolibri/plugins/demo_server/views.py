from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.views.generic.base import TemplateView


class StyleGuideView(TemplateView):
    template_name = "style_guide/style_guide.html"
