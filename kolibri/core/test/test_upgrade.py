import pytest
from mock import call
from mock import Mock
from mock import patch

from kolibri.core.upgrade import run_upgrades
from kolibri.core.upgrade import VersionUpgrade


def test_filter_old_version():
    filtered_mock = Mock()
    unfiltered_mock = Mock()

    filtered = VersionUpgrade(old_version="<1.1.1", upgrade=filtered_mock)
    not_filtered = VersionUpgrade(upgrade=unfiltered_mock)
    with patch(
        "kolibri.core.upgrade.get_upgrades", return_value=[not_filtered, filtered]
    ):
        run_upgrades("1.1.1", "1.1.2")
        filtered_mock.assert_not_called()
        unfiltered_mock.assert_called_once()


def test_not_filter_alpha_version():
    unfiltered_mock = Mock()

    not_filtered = VersionUpgrade(old_version="<1.1.1", upgrade=unfiltered_mock)
    with patch("kolibri.core.upgrade.get_upgrades", return_value=[not_filtered]):
        run_upgrades("1.1.1.a0", "1.1.2")
        unfiltered_mock.assert_called_once()


def test_not_filter_beta_version():
    unfiltered_mock = Mock()

    not_filtered = VersionUpgrade(old_version="<1.1.1", upgrade=unfiltered_mock)
    with patch("kolibri.core.upgrade.get_upgrades", return_value=[not_filtered]):
        run_upgrades("1.1.1.b0", "1.1.2")
        unfiltered_mock.assert_called_once()


def test_not_filter_dev_version():
    unfiltered_mock = Mock()

    not_filtered = VersionUpgrade(old_version="<1.1.1", upgrade=unfiltered_mock)
    with patch("kolibri.core.upgrade.get_upgrades", return_value=[not_filtered]):
        run_upgrades("1.1.1.dev0", "1.1.2")
        unfiltered_mock.assert_called_once()


def test_order_old_version():
    function = Mock()

    first = VersionUpgrade(old_version="<0.10.1", upgrade=lambda: function(0))
    second = VersionUpgrade(upgrade=lambda: function(1))

    with patch("kolibri.core.upgrade.get_upgrades", return_value=[second, first]):
        run_upgrades("0.10.0", "1.1.2")
        function.assert_has_calls([call(0), call(1)])


def test_order_new_version():
    function = Mock()

    first = VersionUpgrade(new_version=">0.10.1", upgrade=lambda: function(0))
    second = VersionUpgrade(upgrade=lambda: function(1))

    with patch("kolibri.core.upgrade.get_upgrades", return_value=[second, first]):
        run_upgrades("0.10.0", "1.1.2")
        function.assert_has_calls([call(0), call(1)])


def test_order_old_and_new_version():
    function = Mock()

    first = VersionUpgrade(
        old_version="<0.10.1", new_version=">0.11.1", upgrade=lambda: function(0)
    )
    second = VersionUpgrade(
        old_version="<0.10.1", new_version=">0.11.2", upgrade=lambda: function(1)
    )

    with patch("kolibri.core.upgrade.get_upgrades", return_value=[second, first]):
        run_upgrades("0.10.0", "1.1.2")
        function.assert_has_calls([call(0), call(1)])


def test_filter_new_version():
    filtered_mock = Mock()
    unfiltered_mock = Mock()

    filtered = VersionUpgrade(new_version=">1.1.1", upgrade=filtered_mock)
    not_filtered = VersionUpgrade(upgrade=unfiltered_mock)

    with patch(
        "kolibri.core.upgrade.get_upgrades", return_value=[not_filtered, filtered]
    ):
        run_upgrades("1.0.1", "1.1.0")
        filtered_mock.assert_not_called()
        unfiltered_mock.assert_called_once()


def test_blank_old_version():
    function = Mock()

    first = VersionUpgrade(old_version="<0.10.1", upgrade=function)

    with patch("kolibri.core.upgrade.get_upgrades", return_value=[first]):
        run_upgrades("", "1.1.2")
        function.assert_called_once()


def test_invalid_old_version():
    with pytest.raises(TypeError):
        VersionUpgrade(old_version="notaversion", upgrade=lambda: 0)


def test_invalid_new_version():
    with pytest.raises(TypeError):
        VersionUpgrade(new_version="notaversion", upgrade=lambda: 0)


def test_invalid_upgrade():
    with pytest.raises(TypeError):
        VersionUpgrade()
