# -*- coding: utf-8 -*-
"""URLs for the Example Plugin

.. moduleauthor:: Learning Equality <info@learningequality.org>

"""
from __future__ import absolute_import, print_function, unicode_literals

from django.conf.urls import url

from . import views

urlpatterns = [
    url('^', views.MyView.as_view(), name='index'),
]
