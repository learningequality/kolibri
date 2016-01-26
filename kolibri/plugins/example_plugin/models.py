# -*- coding: utf-8 -*-
"""TODO: Write something about this module (everything in the docstring
enters the docs)

.. moduleauthor:: Learning Equality <info@learningequality.org>

"""
from __future__ import absolute_import, print_function, unicode_literals

from django.db import models


class MyPluginModel(models.Model):

    a_field = models.IntegerField()
