import pytest

from kolibri.plugins import DEFAULT_PLUGINS
from kolibri.plugins.utils import enable_plugin


@pytest.mark.parametrize("plugin", DEFAULT_PLUGINS)
def test_can_enable_all_default_plugins(plugin):
    assert enable_plugin(plugin)
