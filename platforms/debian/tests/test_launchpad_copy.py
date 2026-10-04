"""Tests for scripts/launchpad_copy.py.

All launchpadlib calls are mocked. distro_info is mocked, or reads a
fixture ubuntu.csv via the ubuntu_csv fixture.
"""

import datetime
import ssl
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

from scripts.launchpad_copy import build_parser
from scripts.launchpad_copy import cmd_copy_to_series
from scripts.launchpad_copy import get_current_series
from scripts.launchpad_copy import get_supported_series
from scripts.launchpad_copy import LaunchpadWrapper
from scripts.launchpad_copy import PROPOSED_PPA_NAME

PACKAGE_ARGS = ["--source-package", "kolibri-source", "--binary-package", "kolibri"]


@pytest.fixture
def ubuntu_csv(tmp_path):
    """Point distro_info at an ubuntu.csv with an ESM-only, two LTS, and an unreleased series."""
    today = datetime.datetime.now(datetime.timezone.utc).date()

    def days(n):
        return (today + datetime.timedelta(days=n)).isoformat()

    rows = [
        "version,codename,series,created,release,eol,eol-server,eol-esm",
        f"16.04 LTS,Xenial Xerus,xenial,{days(-4000)},{days(-3900)},{days(-1000)},{days(-1000)},{days(1000)}",
        f"22.04 LTS,Jammy Jellyfish,jammy,{days(-1100)},{days(-1000)},{days(1000)},{days(1000)},{days(3000)}",
        f"24.04 LTS,Noble Numbat,noble,{days(-600)},{days(-500)},{days(2000)},{days(2000)},{days(4000)}",
        f"26.10,Devel,devel,{days(-10)},{days(100)},{days(300)},,",
    ]
    (tmp_path / "ubuntu.csv").write_text("\n".join(rows) + "\n")
    with patch("distro_info._get_data_dir", return_value=str(tmp_path)):
        yield


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

    @pytest.mark.usefixtures("ubuntu_csv")
    def test_no_esm_excludes_unreleased_series(self):
        result = get_supported_series(source_series="noble", include_esm=False)

        assert result == ["jammy"]

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


def make_mock_source(
    status="Published",
    series_name="noble",
    name="kolibri-source",
    version="0.19.3-0ubuntu1",
):
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


def make_mock_lp():
    """Create a mocked Launchpad API: (lp, proposed PPA, release PPA, series)."""
    mock_lp = MagicMock()
    mock_owner = MagicMock()
    mock_proposed = MagicMock()
    mock_release = MagicMock()
    mock_series = MagicMock()

    mock_lp.people.__getitem__ = MagicMock(return_value=mock_owner)
    mock_owner.getPPAByName = MagicMock(
        side_effect=lambda name: (
            mock_proposed if name == PROPOSED_PPA_NAME else mock_release
        )
    )
    mock_proposed.distribution.getSeries = MagicMock(return_value=mock_series)

    return mock_lp, mock_proposed, mock_release, mock_series


def make_wrapper_with_mock_lp(
    source_package="kolibri-source", binary_package="kolibri"
):
    """Create a LaunchpadWrapper with mocked Launchpad API."""
    wrapper = LaunchpadWrapper(source_package, binary_package)
    mock_lp, mock_proposed, mock_release, mock_series = make_mock_lp()
    # Fills this instance's cached_property; other instances still log in
    wrapper.lp = mock_lp

    return wrapper, mock_proposed, mock_release, mock_series


# --- check_source tests ---


class TestCheckSource:
    def test_returns_0_when_source_exists(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        source = make_mock_source(status="Published")
        mock_ppa.getPublishedSources.return_value = [source]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.check_source("0.19.3-0ubuntu1")
        assert result == 0

    def test_returns_1_when_source_missing(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        mock_ppa.getPublishedSources.return_value = []

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.check_source("0.19.3-0ubuntu1")
        assert result == 1

    def test_ignores_deleted_sources(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        deleted = make_mock_source(status="Deleted")
        mock_ppa.getPublishedSources.return_value = [deleted]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.check_source("0.19.3-0ubuntu1")
        assert result == 1

    def test_ignores_superseded_sources(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        superseded = make_mock_source(status="Superseded")
        mock_ppa.getPublishedSources.return_value = [superseded]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.check_source("0.19.3-0ubuntu1")
        assert result == 1

    def test_custom_ppa_name(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        mock_ppa.getPublishedSources.return_value = []

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        wrapper.check_source("0.19.3-0ubuntu1", ppa_name="kolibri")

        wrapper.get_ppa.assert_called_with("kolibri")

    def test_returns_2_on_api_error(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        mock_ppa.getPublishedSources.side_effect = Exception("connection timeout")

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.check_source("0.19.3-0ubuntu1")
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
        mock_ppa.syncSources.side_effect = Exception(
            "same version already published in focal"
        )

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

    @patch("scripts.launchpad_copy.UbuntuDistroInfo")
    def test_skips_superseded_source(self, MockDistroInfo):
        MockDistroInfo.return_value.lts.return_value = "noble"
        MockDistroInfo.return_value.supported.return_value = ["jammy", "noble"]
        MockDistroInfo.return_value.supported_esm.return_value = []
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp(
            "kolibri-server", "kolibri-server"
        )
        source = make_mock_source(
            name="kolibri-server", series_name="noble", status="Superseded"
        )
        source.getBuilds.return_value = [make_mock_build()]
        mock_ppa.distribution.getSeries.side_effect = lambda name_or_version: (
            name_or_version
        )
        mock_ppa.getPublishedSources.side_effect = lambda **kwargs: (
            [source] if kwargs.get("distro_series") == "noble" else []
        )

        wrapper.copy_to_series()

        mock_ppa.syncSources.assert_not_called()


# --- wait_for_published tests ---


class TestWaitForPublished:
    def test_returns_0_when_all_published(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        source = make_mock_source(series_name="noble")
        mock_ppa.getPublishedSources.return_value = [source]

        mock_binary = MagicMock()
        mock_binary.status = "Published"
        mock_binary.distro_arch_series_link = (
            "https://api.launchpad.net/devel/ubuntu/noble/amd64"
        )
        mock_ppa.getPublishedBinaries.return_value = [mock_binary]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.wait_for_published(
            "0.19.3-0ubuntu1",
            series=["noble"],
            timeout=5,
            interval=1,
        )

        assert result == 0

    def test_queries_binaries_by_binary_name(self):
        """Binaries are queried by the binary name, not the source name.

        Regression: wait_for_published used to query getPublishedBinaries
        with the source name ("kolibri-source"), which never matches the
        actual binary ("kolibri"), so the wait could only ever time out.
        """
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()
        source = make_mock_source(series_name="noble")
        mock_ppa.getPublishedSources.return_value = [source]
        mock_binary = MagicMock()
        mock_binary.status = "Published"
        mock_binary.distro_arch_series_link = (
            "https://api.launchpad.net/devel/ubuntu/noble/amd64"
        )
        mock_ppa.getPublishedBinaries.return_value = [mock_binary]
        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        # series=None so the source-discovery branch also runs
        result = wrapper.wait_for_published("0.19.3-0ubuntu1", timeout=5, interval=1)

        assert result == 0
        assert (
            mock_ppa.getPublishedSources.call_args.kwargs["source_name"]
            == "kolibri-source"
        )
        assert (
            mock_ppa.getPublishedBinaries.call_args.kwargs["binary_name"] == "kolibri"
        )

    def test_returns_1_on_timeout(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        source = make_mock_source(series_name="noble")
        mock_ppa.getPublishedSources.return_value = [source]
        mock_ppa.getPublishedBinaries.return_value = []  # No binaries yet

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.wait_for_published(
            "0.19.3-0ubuntu1",
            series=["noble"],
            timeout=1,
            interval=1,
        )

        assert result == 1

    def test_waits_for_all_series(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        noble_source = make_mock_source(series_name="noble")
        jammy_source = make_mock_source(series_name="jammy")
        mock_ppa.getPublishedSources.return_value = [noble_source, jammy_source]

        noble_binary = MagicMock()
        noble_binary.status = "Published"
        noble_binary.distro_arch_series_link = (
            "https://api.launchpad.net/devel/ubuntu/noble/amd64"
        )
        jammy_binary = MagicMock()
        jammy_binary.status = "Published"
        jammy_binary.distro_arch_series_link = (
            "https://api.launchpad.net/devel/ubuntu/jammy/amd64"
        )
        mock_ppa.getPublishedBinaries.return_value = [noble_binary, jammy_binary]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.wait_for_published(
            "0.19.3-0ubuntu1",
            timeout=5,
            interval=1,
        )

        assert result == 0

    def test_filters_by_requested_series(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        noble_source = make_mock_source(series_name="noble")
        jammy_source = make_mock_source(series_name="jammy")
        mock_ppa.getPublishedSources.return_value = [noble_source, jammy_source]

        noble_binary = MagicMock()
        noble_binary.status = "Published"
        noble_binary.distro_arch_series_link = (
            "https://api.launchpad.net/devel/ubuntu/noble/amd64"
        )
        mock_ppa.getPublishedBinaries.return_value = [noble_binary]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        # Only waiting for noble, not jammy
        result = wrapper.wait_for_published(
            "0.19.3-0ubuntu1",
            series=["noble"],
            timeout=5,
            interval=1,
        )

        assert result == 0

    def test_ignores_deleted_sources(self):
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        deleted = make_mock_source(series_name="noble", status="Deleted")
        active = make_mock_source(series_name="jammy", status="Published")
        mock_ppa.getPublishedSources.return_value = [deleted, active]

        jammy_binary = MagicMock()
        jammy_binary.status = "Published"
        jammy_binary.distro_arch_series_link = (
            "https://api.launchpad.net/devel/ubuntu/jammy/amd64"
        )
        mock_ppa.getPublishedBinaries.return_value = [jammy_binary]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        result = wrapper.wait_for_published(
            "0.19.3-0ubuntu1",
            timeout=5,
            interval=1,
        )

        assert result == 0

    def test_retries_transient_connection_error(self):
        """A transient SSL/connection blip during a poll is retried, not fatal.

        Regression: a stale keep-alive socket raised ssl.SSLEOFError between
        polls (the interval is long enough for Launchpad to drop idle
        connections), which aborted the entire release wait.
        """
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        source = make_mock_source(series_name="noble")
        mock_ppa.getPublishedSources.return_value = [source]

        mock_binary = MagicMock()
        mock_binary.status = "Published"
        mock_binary.distro_arch_series_link = (
            "https://api.launchpad.net/devel/ubuntu/noble/amd64"
        )
        # First poll raises a transient error; the retry reconnects and succeeds.
        mock_ppa.getPublishedBinaries.side_effect = [
            ssl.SSLEOFError("EOF occurred in violation of protocol (_ssl.c:2406)"),
            [mock_binary],
        ]

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        with patch("scripts.launchpad_copy.time.sleep"):
            result = wrapper.wait_for_published(
                "0.19.3-0ubuntu1",
                series=["noble"],
                timeout=5,
                interval=1,
            )

        assert result == 0
        assert mock_ppa.getPublishedBinaries.call_count == 2

    def test_transient_errors_propagate_after_exhausting_retries(self):
        """A transient error that never clears is raised, not silently ignored."""
        wrapper, mock_ppa, _, _ = make_wrapper_with_mock_lp()

        source = make_mock_source(series_name="noble")
        mock_ppa.getPublishedSources.return_value = [source]
        mock_ppa.getPublishedBinaries.side_effect = ssl.SSLEOFError("boom")

        wrapper.get_ppa = MagicMock(return_value=mock_ppa)

        with patch("scripts.launchpad_copy.time.sleep"):
            with pytest.raises(ssl.SSLEOFError):
                wrapper.wait_for_published(
                    "0.19.3-0ubuntu1",
                    series=["noble"],
                    timeout=5,
                    interval=1,
                )


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
        mock_release.syncSources.side_effect = Exception(
            "same version already published"
        )

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
        wrapper, mock_proposed, _mock_release, _ = make_wrapper_with_mock_lp()
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


# --- series helpers ---


def test_get_current_series_returns_lts():
    """The publish series is the current LTS, not the runner's OS series.

    Regression: this used `lsb_release -cs` (the runner, e.g. noble), which
    diverges from the upload target chosen for the changelog (the latest LTS,
    e.g. resolute) once a new LTS ships before the runner image updates.
    """
    with patch("scripts.launchpad_copy.UbuntuDistroInfo") as MockUDI:
        MockUDI.return_value.lts.return_value = "resolute"
        assert get_current_series() == "resolute"


# --- CLI parser tests ---


class TestBuildParser:
    def test_check_source_args(self):
        parser = build_parser()
        args = parser.parse_args(
            [
                *PACKAGE_ARGS,
                "check-source",
                "--version",
                "0.19.3-0ubuntu1",
            ]
        )
        assert args.command == "check-source"
        assert args.version == "0.19.3-0ubuntu1"
        assert args.ppa == PROPOSED_PPA_NAME

    def test_copy_to_series_args(self):
        parser = build_parser()
        args = parser.parse_args([*PACKAGE_ARGS, "copy-to-series", "--series", "noble"])
        assert args.command == "copy-to-series"
        assert args.series == "noble"

    def test_copy_to_series_defaults(self):
        parser = build_parser()
        args = parser.parse_args([*PACKAGE_ARGS, "copy-to-series"])
        assert args.series is None

    def test_wait_for_published_args(self):
        parser = build_parser()
        args = parser.parse_args(
            [
                *PACKAGE_ARGS,
                "wait-for-published",
                "--version",
                "0.19.3-0ubuntu1",
                "--timeout",
                "3600",
                "--interval",
                "30",
                "--series",
                "noble",
                "jammy",
            ]
        )
        assert args.command == "wait-for-published"
        assert args.timeout == 3600
        assert args.interval == 30
        assert args.series == ["noble", "jammy"]

    def test_promote_args(self):
        parser = build_parser()
        args = parser.parse_args(
            [*PACKAGE_ARGS, "promote", "--version", "0.19.3-0ubuntu1"]
        )
        assert args.command == "promote"
        assert args.version == "0.19.3-0ubuntu1"

    def test_requires_subcommand(self):
        parser = build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(PACKAGE_ARGS)

    @pytest.mark.parametrize("flag", ["--source-package", "--binary-package"])
    def test_requires_both_package_names(self, flag):
        index = PACKAGE_ARGS.index(flag)
        args = PACKAGE_ARGS[:index] + PACKAGE_ARGS[index + 2 :]
        with pytest.raises(SystemExit):
            build_parser().parse_args([*args, "promote", "--version", "1.0"])


class TestPackageNames:
    """Every operation acts on the wrapper's packages, never the other pipeline's."""

    def setup_method(self):
        self.wrapper, self.ppa, self.release, _ = make_wrapper_with_mock_lp(
            "kolibri-server", "kolibri-server"
        )

    def test_check_source_ignores_other_package(self):
        published = [
            make_mock_source(name="kolibri-server-extras", version="0.5.1-0ubuntu1")
        ]

        # Launchpad matches source_name as a substring unless exact_match is set
        def published_sources(source_name, exact_match=False, **kwargs):
            return [
                s
                for s in published
                if s.source_package_name == source_name
                or (not exact_match and source_name in s.source_package_name)
            ]

        self.ppa.getPublishedSources.side_effect = published_sources

        assert self.wrapper.check_source("0.5.1-0ubuntu1") == 1

    @patch("scripts.launchpad_copy.UbuntuDistroInfo")
    def test_copy_to_series_copies_only_source_package(self, MockDistroInfo):
        MockDistroInfo.return_value.lts.return_value = "noble"
        MockDistroInfo.return_value.supported.return_value = ["jammy", "noble"]
        MockDistroInfo.return_value.supported_esm.return_value = []
        sources = [
            make_mock_source(name=name, series_name="noble")
            for name in ("kolibri-server", "kolibri-source")
        ]
        for source in sources:
            source.getBuilds.return_value = [make_mock_build()]
        self.ppa.distribution.getSeries.side_effect = lambda name_or_version: (
            name_or_version
        )
        self.ppa.getPublishedSources.side_effect = lambda **kwargs: (
            sources if kwargs.get("distro_series") == "noble" else []
        )

        self.wrapper.copy_to_series()

        self.ppa.syncSources.assert_called_once()
        assert self.ppa.syncSources.call_args.kwargs["source_names"] == [
            "kolibri-server"
        ]

    @pytest.mark.parametrize("flags,esm_targeted", [([], True), (["--no-esm"], False)])
    @pytest.mark.usefixtures("ubuntu_csv")
    def test_copy_to_series_no_esm_flag(self, flags, esm_targeted):
        lp, ppa, _, _ = make_mock_lp()
        source = make_mock_source(name="kolibri-source", series_name="noble")
        source.getBuilds.return_value = [make_mock_build()]
        ppa.distribution.getSeries.side_effect = lambda name_or_version: name_or_version
        ppa.getPublishedSources.side_effect = lambda **kwargs: (
            [source] if kwargs.get("distro_series") == "noble" else []
        )
        args = build_parser().parse_args(
            [*PACKAGE_ARGS, "copy-to-series", "--series", "noble", *flags]
        )

        with patch("scripts.launchpad_copy.Launchpad") as MockLaunchpad:
            MockLaunchpad.login_with.return_value = lp
            cmd_copy_to_series(args)

        calls = ppa.syncSources.call_args_list
        assert all(call.kwargs["source_names"] == ["kolibri-source"] for call in calls)
        targets = [call.kwargs["to_series"] for call in calls]
        assert "jammy" in targets
        assert ("xenial" in targets) is esm_targeted
        assert ("devel" in targets) is esm_targeted

    def test_promote_promotes_only_source_package(self):
        self.ppa.getPublishedSources.return_value = [
            make_mock_source(name="kolibri-server", version="0.5.1-0ubuntu1"),
            make_mock_source(name="kolibri-source", version="0.5.1-0ubuntu1"),
        ]

        result = self.wrapper.promote("0.5.1-0ubuntu1")

        assert result == 0
        self.release.syncSources.assert_called_once()
        assert self.release.syncSources.call_args.kwargs["source_names"] == [
            "kolibri-server"
        ]

    def test_promote_fails_when_only_other_package_published(self):
        self.ppa.getPublishedSources.return_value = [
            make_mock_source(name="kolibri-source", version="0.5.1-0ubuntu1"),
        ]

        result = self.wrapper.promote("0.5.1-0ubuntu1")

        assert result == 1
        self.release.syncSources.assert_not_called()

    def test_wait_for_published_ignores_binary_name_superstring(self):
        wrapper, ppa, _, _ = make_wrapper_with_mock_lp()
        wrapper.get_ppa = MagicMock(return_value=ppa)
        server_binary = MagicMock()
        server_binary.binary_package_name = "kolibri-server"
        server_binary.status = "Published"
        server_binary.distro_arch_series_link = (
            "https://api.launchpad.net/devel/ubuntu/noble/amd64"
        )

        # Launchpad matches binary_name as a substring unless exact_match is set
        def published_binaries(binary_name, exact_match=False, **kwargs):
            name = server_binary.binary_package_name
            if name == binary_name or (not exact_match and binary_name in name):
                return [server_binary]
            return []

        ppa.getPublishedBinaries.side_effect = published_binaries

        result = wrapper.wait_for_published(
            "0.20.0-0ubuntu1", series=["noble"], timeout=1, interval=1
        )

        assert result == 1
