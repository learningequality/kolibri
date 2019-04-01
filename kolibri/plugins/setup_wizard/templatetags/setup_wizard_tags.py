"""
setup_wizard template tags
==========================

Tags for including setup_wizard app javascript assets ina template. To use:

.. code-block:: html

    {% load setup_wizard_tags %}

    <!-- Render inclusion tag for frontend JS elements -->
    {% setup_wizard_assets %}

"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django import template

from .. import hooks
from kolibri.core.webpack.utils import webpack_asset_render

register = template.Library()


@register.simple_tag()
def setup_wizard_assets():
    """
    Using in a template will inject script tags that include the javascript assets defined
    by any concrete hook that subclasses ManagementSyncHook.

    :return: HTML of script tags to insert into setup_wizard/setup_wizard.html
    """
    return webpack_asset_render(hooks.SetupWizardSyncHook, is_async=False)


@register.simple_tag()
def setup_wizard_async_assets():
    """
    Using in a template will inject script tags that include the javascript assets defined
    by any concrete hook that subclasses ManagementSyncHook.

    :return: HTML of script tags to insert into setup_wizard/setup_wizard.html
    """
    return webpack_asset_render(hooks.SetupWizardAsyncHook, is_async=True)
