#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# Copyright 2023 Endless OS Foundation, LLC
# SPDX-License-Identifier: MIT
from django.urls import re_path

from .views import PwaManifestView

urlpatterns = [
    re_path(r"^manifest.webmanifest$", PwaManifestView.as_view(), name="manifest"),
]
