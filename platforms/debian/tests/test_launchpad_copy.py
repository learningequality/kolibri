"""Tests for scripts/launchpad_copy.py.

All launchpadlib and distro_info calls are mocked so tests run without
those packages installed.
"""

from unittest.mock import MagicMock, patch, PropertyMock
import pytest

from scripts.launchpad_copy import (
    get_supported_series,
    LaunchpadWrapper,
    PACKAGE_WHITELIST,
    PROPOSED_PPA_NAME,
    RELEASE_PPA_NAME,
    POCKET,
    build_parser,
)


# --- Series discovery tests ---


class TestGetSupportedSeries:
    """Tests for get_supported_series using distro_info."""

    @patch("scripts.launchpad_copy.UbuntuDistroInfo")
    def test_returns_supported_series_excluding_source(self, MockDistroInfo):
        mock_ubuntu = MagicMock()
        mock_ubuntu.supported.return_value = ["focal", "jammy", "noble"]
        mock_ubuntu.supported_esm.return_value = ["xenial", "bionic"]
        MockDistroInfo.return_value = mock_ubuntu

        result = get_supported_series(source_series="noble")

        assert "noble" not in result
        assert "focal" in result
        assert "jammy" in result
        assert "xenial" in result
        assert "bionic" in result

    @patch("scripts.launchpad_copy.UbuntuDistroInfo")
    def test_handles_missing_esm_method(self, MockDistroInfo):
        mock_ubuntu = MagicMock()
        mock_ubuntu.supported.return_value = ["jammy", "noble"]
        mock_ubuntu.supported_esm.side_effect = AttributeError
        MockDistroInfo.return_value = mock_ubuntu

        result = get_supported_series(source_series="noble")

        assert result == ["jammy"]

    @patch("scripts.launchpad_copy.UbuntuDistroInfo")
    def test_esm_deduplicates_with_supported(self, MockDistroInfo):
        mock_ubuntu = MagicMock()
        mock_ubuntu.supported.return_value = ["jammy", "noble"]
        mock_ubuntu.supported_esm.return_value = ["jammy", "focal"]
        MockDistroInfo.return_value = mock_ubuntu

        result = get_supported_series(source_series="noble")

        assert result == ["focal", "jammy"]

    @patch("scripts.launchpad_copy.UbuntuDistroInfo", None)
    def test_raises_when_distro_info_unavailable(self):
        with pytest.raises(ImportError, match="distro-info"):
            get_supported_series(source_series="noble")

    @patch("scripts.launchpad_copy.UbuntuDistroInfo")
    def test_returns_sorted(self, MockDistroInfo):
        mock_ubuntu = MagicMock()
        mock_ubuntu.supported.return_value = ["noble", "focal", "jammy"]
        mock_ubuntu.supported_esm.side_effect = AttributeError
        MockDistroInfo.return_value = mock_ubuntu

        result = get_supported_series(source_series="")

        assert result == sorted(result)


# --- Helper to build a mock LaunchpadWrapper ---


def make_mock_source(status="Published", series_name="noble", name="kolibri-source",
                     version="0.19.3-0ubuntu1"):
    """Create a mock source publication."""
    source = MagicMock()
    source.status = status
    source.source_package_name = name
    source.source_package_version = version
    source.distro_series_link = f"https://api.launchpad.net/devel/ubuntu/{series_name}"
    return source


def make_mock_build(state="Successfully built"):
    """Create a mock build object."""
    build = MagicMock()
    build.buildstate = state
    build.web_link = "https://launchpad.net/build/123"
    return build


def make_wrapper_with_mock_lp():
    """Create a LaunchpadWrapper with mocked Launchpad API."""
    wrapper = LaunchpadWrapper()

    mock_lp = MagicMock()
    mock_owner = MagicMock()
    mock_proposed = MagicMock()
    mock_release = MagicMock()
    mock_series = MagicMock()

    mock_lp.people.__getitem__ = MagicMock(return_value=mock_owner)
    mock_owner.getPPAByName = MagicMock(
        side_effect=lambda name: mock_proposed if name == PROPOSED_PPA_NAME else mock_release
    )
    mock_proposed.distribution.getSeries = MagicMock(return_value=mock_series)

    # Inject cached properties
    type(wrapper).lp = PropertyMock(return_value=mock_lp)
    type(wrapper).owner = PropertyMock(return_value=mock_owner)
    type(wrapper).proposed_ppa = PropertyMock(return_value=mock_proposed)
    type(wrapper).release_ppa = PropertyMock(return_value=mock_release)

    return wrapper, mock_proposed, mock_release, mock_series


# --- check_source tests ---


class TestCheckSource:
    def test_returns_0_when_source_exists(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        source = make_mock_source(status="Published")
        mock_ppa.getPublishedSources.return_value = [source]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.check_source("kolibri-source", "0.19.3-0ubuntu1")
        assert result == 0

    def test_returns_1_when_source_missing(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        mock_ppa.getPublishedSources.return_value = []

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.check_source("kolibri-source", "0.19.3-0ubuntu1")
        assert result == 1

    def test_ignores_deleted_sources(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        deleted = make_mock_source(status="Deleted")
        mock_ppa.getPublishedSources.return_value = [deleted]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.check_source("kolibri-source", "0.19.3-0ubuntu1")
        assert result == 1

    def test_ignores_superseded_sources(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        superseded = make_mock_source(status="Superseded")
        mock_ppa.getPublishedSources.return_value = [superseded]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.check_source("kolibri-source", "0.19.3-0ubuntu1")
        assert result == 1

    def test_custom_ppa_name(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        mock_ppa.getPublishedSources.return_value = []

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        wrapper.check_source("kolibri-source", "0.19.3-0ubuntu1", ppa_name="kolibri")

        wrapper.get_ppa.assert_called_with("kolibri")

    def test_returns_2_on_api_error(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        mock_ppa.getPublishedSources.side_effect = Exception("connection timeout")

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.check_source("kolibri-source", "0.19.3-0ubuntu1")
        assert result == 2


# --- copy_to_series tests ---


class TestCopyToSeries:
    @patch("scripts.launchpad_copy.get_supported_series")
    @patch("scripts.launchpad_copy.get_current_series")
    def test_queues_copies_for_missing_series(self, mock_current, mock_supported):
        mock_current.return_value = "noble"
        mock_supported.return_value = ["focal", "jammy"]

        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        # Source is published with binaries in noble
        noble_source = make_mock_source(series_name="noble")
        noble_build = make_mock_build("Successfully built")

        # Set up get_published_sources to return the noble source
        mock_ppa.getPublishedSources.return_value = [noble_source]

        # get_source_packages returns sources indexed by name/version
        wrapper.get_source_packages = MagicMock(
            side_effect=lambda ppa, series: (
                {"kolibri-source": {"0.19.3-0ubuntu1": noble_source}}
                if series == "noble"
                else {}
            )
        )
        wrapper.get_builds_for_source = MagicMock(return_value=[noble_build])

        result = wrapper.copy_to_series()

        assert result == 0
        # Should have attempted syncSources for the missing series
        assert mock_ppa.syncSources.call_count == 2

    @patch("scripts.launchpad_copy.get_supported_series")
    @patch("scripts.launchpad_copy.get_current_series")
    def test_skips_already_present(self, mock_current, mock_supported):
        mock_current.return_value = "noble"
        mock_supported.return_value = ["focal"]

        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        noble_source = make_mock_source(series_name="noble")
        focal_source = make_mock_source(series_name="focal")
        noble_build = make_mock_build("Successfully built")

        mock_ppa.getPublishedSources.return_value = [noble_source]

        wrapper.get_source_packages = MagicMock(
            side_effect=lambda ppa, series: (
                {"kolibri-source": {"0.19.3-0ubuntu1": noble_source}}
                if series == "noble"
                else {"kolibri-source": {"0.19.3-0ubuntu1": focal_source}}
            )
        )
        wrapper.get_builds_for_source = MagicMock(return_value=[noble_build])

        result = wrapper.copy_to_series()

        assert result == 0
        # focal already present, no copies needed
        assert mock_ppa.syncSources.call_count == 0

    @patch("scripts.launchpad_copy.get_supported_series")
    @patch("scripts.launchpad_copy.get_current_series")
    def test_handles_already_copied_error(self, mock_current, mock_supported):
        mock_current.return_value = "noble"
        mock_supported.return_value = ["focal"]

        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        noble_source = make_mock_source(series_name="noble")
        noble_build = make_mock_build("Successfully built")

        mock_ppa.getPublishedSources.return_value = [noble_source]

        wrapper.get_source_packages = MagicMock(
            side_effect=lambda ppa, series: (
                {"kolibri-source": {"0.19.3-0ubuntu1": noble_source}}
                if series == "noble"
                else {}
            )
        )
        wrapper.get_builds_for_source = MagicMock(return_value=[noble_build])
        mock_ppa.syncSources.side_effect = Exception("same version already published in focal")

        result = wrapper.copy_to_series()

        assert result == 0  # Gracefully handled

    @patch("scripts.launchpad_copy.get_supported_series")
    @patch("scripts.launchpad_copy.get_current_series")
    def test_reports_copy_failures(self, mock_current, mock_supported):
        mock_current.return_value = "noble"
        mock_supported.return_value = ["focal"]

        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        noble_source = make_mock_source(series_name="noble")
        noble_build = make_mock_build("Successfully built")

        mock_ppa.getPublishedSources.return_value = [noble_source]

        wrapper.get_source_packages = MagicMock(
            side_effect=lambda ppa, series: (
                {"kolibri-source": {"0.19.3-0ubuntu1": noble_source}}
                if series == "noble"
                else {}
            )
        )
        wrapper.get_builds_for_source = MagicMock(return_value=[noble_build])
        mock_ppa.syncSources.side_effect = Exception("unexpected error")

        result = wrapper.copy_to_series()

        assert result == 1


# --- wait_for_published tests ---


class TestWaitForPublished:
    def test_returns_0_when_all_published(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        source = make_mock_source(series_name="noble")
        mock_ppa.getPublishedSources.return_value = [source]

        mock_binary = MagicMock()
        mock_binary.status = "Published"
        mock_binary.distro_arch_series_link = "https://api.launchpad.net/devel/ubuntu/noble/amd64"
        mock_ppa.getPublishedBinaries.return_value = [mock_binary]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.wait_for_published(
            "kolibri-source", "0.19.3-0ubuntu1",
            series=["noble"], timeout=5, interval=1,
        )

        assert result == 0

    def test_returns_1_on_timeout(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        source = make_mock_source(series_name="noble")
        mock_ppa.getPublishedSources.return_value = [source]
        mock_ppa.getPublishedBinaries.return_value = []  # No binaries yet

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.wait_for_published(
            "kolibri-source", "0.19.3-0ubuntu1",
            series=["noble"], timeout=1, interval=1,
        )

        assert result == 1

    def test_waits_for_all_series(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        noble_source = make_mock_source(series_name="noble")
        jammy_source = make_mock_source(series_name="jammy")
        mock_ppa.getPublishedSources.return_value = [noble_source, jammy_source]

        noble_binary = MagicMock()
        noble_binary.status = "Published"
        noble_binary.distro_arch_series_link = "https://api.launchpad.net/devel/ubuntu/noble/amd64"
        jammy_binary = MagicMock()
        jammy_binary.status = "Published"
        jammy_binary.distro_arch_series_link = "https://api.launchpad.net/devel/ubuntu/jammy/amd64"
        mock_ppa.getPublishedBinaries.return_value = [noble_binary, jammy_binary]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.wait_for_published(
            "kolibri-source", "0.19.3-0ubuntu1", timeout=5, interval=1,
        )

        assert result == 0

    def test_filters_by_requested_series(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        noble_source = make_mock_source(series_name="noble")
        jammy_source = make_mock_source(series_name="jammy")
        mock_ppa.getPublishedSources.return_value = [noble_source, jammy_source]

        noble_binary = MagicMock()
        noble_binary.status = "Published"
        noble_binary.distro_arch_series_link = "https://api.launchpad.net/devel/ubuntu/noble/amd64"
        mock_ppa.getPublishedBinaries.return_value = [noble_binary]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        # Only waiting for noble, not jammy
        result = wrapper.wait_for_published(
            "kolibri-source", "0.19.3-0ubuntu1",
            series=["noble"], timeout=5, interval=1,
        )

        assert result == 0

    def test_ignores_deleted_sources(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        deleted = make_mock_source(series_name="noble", status="Deleted")
        active = make_mock_source(series_name="jammy", status="Published")
        mock_ppa.getPublishedSources.return_value = [deleted, active]

        jammy_binary = MagicMock()
        jammy_binary.status = "Published"
        jammy_binary.distro_arch_series_link = "https://api.launchpad.net/devel/ubuntu/jammy/amd64"
        mock_ppa.getPublishedBinaries.return_value = [jammy_binary]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.wait_for_published(
            "kolibri-source", "0.19.3-0ubuntu1", timeout=5, interval=1,
        )

        assert result == 0


# --- promote tests ---


class TestPromote:
    def test_promotes_published_packages(self):
        wrapper, mock_proposed, mock_release, _ = make_wrapper_with_mock_lp()

        noble_source = make_mock_source(series_name="noble")
        jammy_source = make_mock_source(series_name="jammy")
        mock_proposed.getPublishedSources.return_value = [noble_source, jammy_source]

        result = wrapper.promote("0.19.3-0ubuntu1")

        assert result == 0
        assert mock_release.syncSources.call_count == 2

    def test_handles_already_published(self):
        wrapper, mock_proposed, mock_release, _ = make_wrapper_with_mock_lp()

        source = make_mock_source(series_name="noble")
        mock_proposed.getPublishedSources.return_value = [source]
        mock_release.syncSources.side_effect = Exception("same version already published")

        result = wrapper.promote("0.19.3-0ubuntu1")

        assert result == 0

    def test_handles_obsolete_series(self):
        wrapper, mock_proposed, mock_release, _ = make_wrapper_with_mock_lp()

        source = make_mock_source(series_name="trusty")
        mock_proposed.getPublishedSources.return_value = [source]
        mock_release.syncSources.side_effect = Exception(
            "trusty is obsolete and will not accept new uploads"
        )

        result = wrapper.promote("0.19.3-0ubuntu1")

        assert result == 0

    def test_reports_unexpected_errors(self):
        wrapper, mock_proposed, mock_release, _ = make_wrapper_with_mock_lp()

        source = make_mock_source(series_name="noble")
        mock_proposed.getPublishedSources.return_value = [source]
        mock_release.syncSources.side_effect = Exception("unexpected launchpad error")

        result = wrapper.promote("0.19.3-0ubuntu1")

        assert result == 1

    def test_returns_1_when_nothing_to_promote(self):
        wrapper, mock_proposed, mock_release, _ = make_wrapper_with_mock_lp()
        mock_proposed.getPublishedSources.return_value = []

        result = wrapper.promote("0.19.3-0ubuntu1")

        assert result == 1

    def test_continues_past_individual_failures(self):
        """Promotion failure in one series should not prevent others."""
        wrapper, mock_proposed, mock_release, _ = make_wrapper_with_mock_lp()

        noble_source = make_mock_source(series_name="noble")
        jammy_source = make_mock_source(series_name="jammy")
        mock_proposed.getPublishedSources.return_value = [noble_source, jammy_source]

        call_count = [0]

        def sync_side_effect(**kwargs):
            call_count[0] += 1
            if kwargs.get("to_series") == "jammy":
                raise Exception("unexpected error")

        mock_release.syncSources.side_effect = sync_side_effect

        result = wrapper.promote("0.19.3-0ubuntu1")

        # Both series were attempted
        assert mock_release.syncSources.call_count == 2
        # Overall result is failure because jammy failed
        assert result == 1


# --- CLI parser tests ---


class TestBuildParser:
    def test_check_source_args(self):
        parser = build_parser()
        args = parser.parse_args([
            "check-source", "--package", "kolibri-source",
            "--version", "0.19.3-0ubuntu1",
        ])
        assert args.command == "check-source"
        assert args.version == "0.19.3-0ubuntu1"
        assert args.package == "kolibri-source"
        assert args.ppa == PROPOSED_PPA_NAME

    def test_copy_to_series_args(self):
        parser = build_parser()
        args = parser.parse_args(["copy-to-series", "--series", "noble"])
        assert args.command == "copy-to-series"
        assert args.series == "noble"

    def test_copy_to_series_defaults(self):
        parser = build_parser()
        args = parser.parse_args(["copy-to-series"])
        assert args.series is None

    def test_wait_for_published_args(self):
        parser = build_parser()
        args = parser.parse_args([
            "wait-for-published",
            "--package", "kolibri-source",
            "--version", "0.19.3-0ubuntu1",
            "--timeout", "3600", "--interval", "30",
            "--series", "noble", "jammy",
        ])
        assert args.command == "wait-for-published"
        assert args.timeout == 3600
        assert args.interval == 30
        assert args.series == ["noble", "jammy"]

    def test_promote_args(self):
        parser = build_parser()
        args = parser.parse_args(["promote", "--version", "0.19.3-0ubuntu1"])
        assert args.command == "promote"
        assert args.version == "0.19.3-0ubuntu1"

    def test_requires_subcommand(self):
        parser = build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args([])
