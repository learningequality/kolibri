# kolibri-context-translation-plugin

A Kolibri plugin that enables in-context translation of the user interface via
Crowdin's Just-in-Place-Translation (JIPT). Enabling it injects the JIPT scripts
into the page `<head>`, registers the `ach-ug` in-context pseudo-language, and
applies the Crowdin/Google-fonts Content-Security-Policy option defaults. It is
an internal translation-workflow tool and is not enabled in normal deployments.
