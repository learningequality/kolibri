# -*- coding: utf-8 -*-
"""TODO: Write something about this module (everything in the docstring
enters the docs)

.. moduleauthor:: Learning Equality <info@learningequality.org>

"""
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from django.views.generic.base import TemplateView


class IndexView(TemplateView):

    template_name = "kolibri/index.html"


class TODOView(TemplateView):
    """While sketching, use this view to visually inform users that a page
    is not yet in place."""

    template_name = "kolibri/todo.html"
