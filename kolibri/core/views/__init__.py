"""TODO: Write something about this module (everything in the docstring
enters the docs)
"""
from __future__ import print_function, unicode_literals, absolute_import

from django.views.generic.base import TemplateView


class IndexView(TemplateView):

    template_name = "kolibri/index.html"


class TODOView(TemplateView):
    """While sketching, use this view to visually inform users that a page
    is not yet in place."""

    template_name = "kolibri/todo.html"
