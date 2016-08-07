"""
setup_wizard template tags
===================

Tags for including setup_wizard app javascript assets ina template. To use:

.. code-block:: html

    {% load setup_wizard_tags %}

    <!-- Render inclusion tag for frontend JS elements -->
    {% setup_wizard_assets %}

"""
from __future__ import absolute_import, print_function, unicode_literals

from django import template
from kolibri.core.webpack.utils import webpack_asset_render

from .. import hooks

register = template.Library()


@register.simple_tag()
def setup_wizard_assets():
    """
    Using in a template will inject script tags that include the javascript assets defined
    by any concrete hook that subclasses ManagementSyncHook.

    :return: HTML of script tags to insert into setup_wizard/setup_wizard.html
    """
    return webpack_asset_render(hooks.SetupWizardSyncHook, async=False)


@register.simple_tag()
def setup_wizard_async_assets():
    """
    Using in a template will inject script tags that include the javascript assets defined
    by any concrete hook that subclasses ManagementSyncHook.

    :return: HTML of script tags to insert into setup_wizard/setup_wizard.html
    """
    return webpack_asset_render(hooks.SetupWizardAsyncHook, async=True)
