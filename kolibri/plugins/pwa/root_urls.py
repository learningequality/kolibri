#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# Copyright 2023 Endless OS Foundation, LLC
# SPDX-License-Identifier: MIT
from django.urls import re_path

from .views import PwaServiceWorkerView

# The service worker has to be exposed at the root of the Kolibri app, as
# otherwise it gets a scope which is too restrictive to be able to function
# properly. See https://www.w3.org/TR/service-workers/#path-restriction.
#
# This means we have to use `root_urls` rather than `urls`. Since the
# urlpatterns from `root_urls` are appended to the global list of urlpatterns
# _after_ the urlpatterns from `urls`, we cannot use the
# `kolibri:kolibri.plugins.pwa:` namespace, as urlpattern lists with identical
# namespaces are not merged. Having two urlpattern lists with identical
# namespaces breaks name reverse lookup.
urlpatterns = [
    re_path(r"^sw.js$", PwaServiceWorkerView.as_view(), name="pwa_service_worker"),
]
