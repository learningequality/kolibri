#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# Copyright 2023 Endless OS Foundation, LLC
# SPDX-License-Identifier: MIT
from django.conf.urls import url

from .views import PwaManifestView

urlpatterns = [
    url(r"^manifest.webmanifest$", PwaManifestView.as_view(), name="manifest"),
]
