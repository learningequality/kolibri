#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# Copyright 2023 Endless OS Foundation, LLC
# SPDX-License-Identifier: MIT
from urllib.parse import quote

from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.gzip import gzip_page
from django.views.generic.base import TemplateView

import kolibri
from kolibri.core.decorators import cache_no_user_data
from kolibri.core.theme_hook import ThemeHook
from kolibri.utils.conf import OPTIONS


@method_decorator(gzip_page, name="dispatch")
@method_decorator(cache_page(60 * 60 * 24 * 7), name="dispatch")
class PwaManifestView(TemplateView):
    template_name = "pwa/manifest.json"
    content_type = "application/manifest+json"

    def get_context_data(self, **kwargs):
        context = super(PwaManifestView, self).get_context_data(**kwargs)
        theme = ThemeHook.get_theme()

        # App should be scoped to the deployment path of Kolibri, no higher
        # otherwise it may interfere with other PWAs from the same domain.
        context["id"] = OPTIONS["Deployment"]["URL_PATH_PREFIX"]

        # Background colour should match what’s used for the main part of the
        # app, which is the #main-wrapper div.
        context["background_color"] = (
            theme.get("brandColors", {}).get("grey", {}).get("v_100", "#f5f5f5")
        )

        # Theme colour should be as defined in the HTML spec:
        # https://html.spec.whatwg.org/multipage/semantics.html#meta-theme-color
        context["theme_color"] = (
            theme.get("brandColors", {}).get("primary", {}).get("v_500", "")
        )

        # Define icons. These are site-specific, but ideally a site which is
        # set up for PWA should define an SVG logo, a 192x192px logo and a
        # 512x512px logo.
        # See https://www.w3.org/TR/appmanifest/#icons-member
        context["icons"] = [
            {
                "src": logo["src"],
                "type": logo.get("content_type", ""),
                "sizes": logo.get("size", ""),
                "label": logo.get("alt", ""),
                "purpose": "maskable" if logo.get("maskable", False) else "any",
            }
            for logo in theme.get("logos", [])
        ]

        # Related apps
        # See [1] https://www.w3.org/TR/appmanifest/#related_applications-member
        # and [2] https://developer.mozilla.org/en-US/docs/Web/Manifest/related_applications
        #
        # Currently this part of the PWA spec is only supported by Edge and
        # Chrome for Android[2]. It may not advance to standardisation unless
        # it gets implemented by more web engines[1]. So the use of it in Kolibri
        # will need to be checked in future to see if either more platforms need
        # to be supported, or if all support for it needs to be removed because
        # it’s been dropped from the standard. If so, Kolibri will be left with
        # a couple of deprecated config keys.
        related_apps = []

        for (config_key, platform_id, url_prefix) in [
            (
                "ANDROID_APPLICATION_ID",
                "play",
                "https://play.google.com/store/apps/details?id=",
            ),
            (
                "WINDOWS_APPLICATION_ID",
                "windows",
                "https://apps.microsoft.com/store/detail/",
            ),
        ]:
            app_id = OPTIONS["Pwa"][config_key]
            if app_id:
                related_apps.append(
                    {
                        "id": app_id,
                        "platform": platform_id,
                        "url": url_prefix + quote(app_id),
                    }
                )

        context["related_applications"] = related_apps
        context["prefer_related_applications"] = OPTIONS["Pwa"][
            "PREFER_RELATED_APPLICATIONS"
        ]

        return context


@method_decorator(cache_no_user_data, name="dispatch")
@method_decorator(gzip_page, name="dispatch")
@method_decorator(cache_page(60 * 60 * 24 * 7), name="dispatch")
class PwaServiceWorkerView(TemplateView):
    template_name = "pwa/sw.js"
    content_type = "application/javascript"

    def get_context_data(self, **kwargs):
        context = super(PwaServiceWorkerView, self).get_context_data(**kwargs)
        # This needs to increment each time a potentially cached asset changes.
        context["version"] = kolibri.__version__
        return context
