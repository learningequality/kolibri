#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# Copyright 2023 Endless OS Foundation, LLC
# SPDX-License-Identifier: MIT
from django.template.loader import render_to_string

from kolibri.core.hooks import FrontEndBaseHeadHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class PwaPlugin(KolibriPluginBase):
    """
    A plugin to support presenting the Kolibri instance as a Progressive Web App
    (PWA).

    This will export a [Web Application Manifest](https://www.w3.org/TR/appmanifest/)
    for the Kolibri instance, so that users can easily run it in a standalone
    browser window.

    For this to give a good user experience, Kolibri must be available locally
    or when the user is offline. The current PWA service worker will not cache
    anything more than the browser usually does.

    For the web app to be installable, the Kolibri instance must be set up to be
    served over HTTPS, as that’s a requirement of the Web Application
    specification.

    You must also provide a themed logo in scalable, 192px and 512px versions.
    """

    kolibri_options = "options"
    translated_view_urls = "urls"
    root_view_urls = "root_urls"


@register_hook
class PwaBaseHeadHook(FrontEndBaseHeadHook):
    @property
    def head_html(self):
        return render_to_string("pwa/head_snippet.html")
