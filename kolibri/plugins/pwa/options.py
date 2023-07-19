#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# Copyright 2023 Endless OS Foundation, LLC
# SPDX-License-Identifier: MIT

option_spec = {
    "Pwa": {
        # Ideally this would be an array of dicts defining *all* the related
        # apps, not just a couple of platform-specific ones. However, the type
        # system for `option_spec` doesn’t support that at the moment.
        "ANDROID_APPLICATION_ID": {
            "type": "string",
            "default": "",
            "description": "ID of the related Android app for this PWA (for example: `com.example.app1`)",
        },
        "WINDOWS_APPLICATION_ID": {
            "type": "string",
            "default": "",
            # See https://web.dev/get-installed-related-apps/#tell-your-website-about-your-windows-app
            "description": "ID of the related Windows app for this PWA (for example: `9WZDNCRFJBH4`, "
            "the <Application> Id value in your Package.appxmanifest file)",
        },
        "PREFER_RELATED_APPLICATIONS": {
            "type": "boolean",
            "default": False,
            "description": "Whether the browser should recommend installing the relevant related application for the platform rather than using the PWA",
        },
    },
}
