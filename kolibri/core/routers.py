"""
Custom router to allow bulk deletion
Modified from https://github.com/miki725/django-rest-framework-bulk
"""
from __future__ import print_function
from __future__ import unicode_literals

import copy

from rest_framework.routers import DefaultRouter
from rest_framework.routers import SimpleRouter


class BulkDeleteRouter(DefaultRouter):
    """
    Map http methods to actions defined on the bulk mixins.
    """

    routes = copy.deepcopy(SimpleRouter.routes)
    routes[0].mapping.update({"delete": "bulk_destroy"})
