"""Tests for scripts/launchpad_copy.py."""

import logging
import os
import shutil
import sys
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest

# Add scripts/ to path so we can import launchpad_copy
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from launchpad_copy import LaunchpadWrapper
from launchpad_copy import build_parser
from launchpad_copy import configure_logging
from launchpad_copy import get_current_series
from launchpad_copy import log

# --- Argparse tests ---


class TestBuildParser:
    """Test the argparse CLI skeleton."""

    def test_verbose_defaults_to_zero(self):
        parser = build_parser()
        args = parser.parse_args(["copy-to-series"])
        assert args.verbose == 0

    def test_verbose_increments_with_v_flags(self):
        parser = build_parser()
        args = parser.parse_args(["-vv", "copy-to-series"])
        assert args.verbose == 2

    def test_copy_to_series_subcommand_parsed(self):
        parser = build_parser()
        args = parser.parse_args(["copy-to-series"])
        assert args.command == "copy-to-series"

    def test_promote_subcommand_parsed(self):
        parser = build_parser()
        args = parser.parse_args(["promote", "--version", "1.0"])
        assert args.command == "promote"

    def test_subcommand_required(self):
        parser = build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args([])

    def test_wait_for_published_subcommand_parsed(self):
        parser = build_parser()
        args = parser.parse_args(["wait-for-published", "--package", "kolibri-server", "--version", "1.0"])
        assert args.command == "wait-for-published"

    def test_wait_for_published_package_required(self):
        parser = build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(["wait-for-published", "--version", "1.0"])

    def test_wait_for_published_version_required(self):
        parser = build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(["wait-for-published", "--package", "kolibri-server"])

    def test_wait_for_published_ppa_defaults_to_kolibri_proposed(self):
        parser = build_parser()
        args = parser.parse_args(["wait-for-published", "--package", "kolibri-server", "--version", "1.0"])
        assert args.ppa == "kolibri-proposed"

    def test_wait_for_published_timeout_defaults_to_1800(self):
        parser = build_parser()
        args = parser.parse_args(["wait-for-published", "--package", "kolibri-server", "--version", "1.0"])
        assert args.timeout == 1800

    def test_wait_for_published_interval_defaults_to_60(self):
        parser = build_parser()
        args = parser.parse_args(["wait-for-published", "--package", "kolibri-server", "--version", "1.0"])
        assert args.interval == 60

    def test_wait_for_published_series_defaults_to_none(self):
        parser = build_parser()
        args = parser.parse_args(["wait-for-published", "--package", "kolibri-server", "--version", "1.0"])
        assert args.series is None

    def test_wait_for_published_series_accepts_multiple(self):
        parser = build_parser()
        args = parser.parse_args(
            ["wait-for-published", "--package", "kolibri-server", "--version", "1.0", "--series", "noble", "jammy"]
        )
        assert args.series == ["noble", "jammy"]

    def test_wait_for_published_custom_timeout_and_interval(self):
        parser = build_parser()
        args = parser.parse_args(
            [
                "wait-for-published",
                "--package",
                "kolibri-server",
                "--version",
                "1.0",
                "--timeout",
                "3600",
                "--interval",
                "30",
            ]
        )
        assert args.timeout == 3600
        assert args.interval == 30

    def test_wait_for_published_custom_ppa(self):
        parser = build_parser()
        args = parser.parse_args(
            ["wait-for-published", "--package", "kolibri-server", "--version", "1.0", "--ppa", "kolibri"]
        )
        assert args.ppa == "kolibri"

    def test_quiet_flag(self):
        parser = build_parser()
        args = parser.parse_args(["-q", "promote", "--version", "1.0"])
        assert args.quiet is True

    def test_debug_flag(self):
        parser = build_parser()
        args = parser.parse_args(["--debug", "promote", "--version", "1.0"])
        assert args.debug is True


# --- Series discovery tests ---

has_lsb_release = shutil.which("lsb_release") is not None


@pytest.mark.skipif(not has_lsb_release, reason="lsb_release not available on this system")
class TestGetCurrentSeries:
    """Test system series detection using real lsb_release."""

    def test_returns_non_empty_string(self):
        result = get_current_series()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_raises_on_missing_command(self):
        with patch("subprocess.check_output", side_effect=FileNotFoundError("no cmd")):
            with pytest.raises(FileNotFoundError):
                get_current_series()


# --- LaunchpadWrapper tests ---


class TestLaunchpadWrapper:
    """Test LaunchpadWrapper queue and filtering logic."""

    def test_queue_copy_accumulates_packages(self):
        wrapper = LaunchpadWrapper()
        wrapper.queue_copy("kolibri-server", "0.5.1-0ubuntu1", "jammy", "noble", "Release")
        wrapper.queue_copy("kolibri-server", "0.5.1-0ubuntu1", "jammy", "focal", "Release")

        assert ("jammy", "noble", "Release") in wrapper.queue
        assert ("jammy", "focal", "Release") in wrapper.queue
        assert ("kolibri-server", "0.5.1-0ubuntu1") in wrapper.queue[("jammy", "noble", "Release")]

    def test_queue_starts_empty(self):
        wrapper = LaunchpadWrapper()
        assert len(wrapper.queue) == 0

    def test_perform_queued_copies_calls_sync_sources(self):
        wrapper = LaunchpadWrapper()
        wrapper.queue_copy("kolibri-server", "0.5.1-0ubuntu1", "jammy", "noble", "Release")

        mock_ppa = MagicMock()
        wrapper.perform_queued_copies(mock_ppa)

        mock_ppa.syncSources.assert_called_once_with(
            from_archive=mock_ppa,
            to_series="noble",
            to_pocket="Release",
            include_binaries=True,
            source_names=["kolibri-server"],
        )

    def test_perform_queued_copies_skips_empty_queues(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        wrapper.perform_queued_copies(mock_ppa)

        mock_ppa.syncSources.assert_not_called()

    def test_perform_queued_copies_handles_already_published(self):
        """Idempotency: syncSources errors for already-copied packages are handled gracefully."""
        wrapper = LaunchpadWrapper()
        wrapper.queue_copy("kolibri-server", "0.5.1-0ubuntu1", "jammy", "noble", "Release")

        class MockBadRequest(Exception):
            pass

        mock_ppa = MagicMock()
        mock_ppa.syncSources.side_effect = MockBadRequest(
            "kolibri-server 0.5.1-0ubuntu1 in noble (same version already published)"
        )

        with patch("launchpad_copy.lre") as mock_lre:
            mock_lre.BadRequest = MockBadRequest
            result = wrapper.perform_queued_copies(mock_ppa)

        assert result == 0  # Should not fail — the error is handled gracefully

    def test_perform_queued_copies_continues_on_failure(self):
        """One series failing doesn't block others."""
        wrapper = LaunchpadWrapper()
        wrapper.queue_copy("kolibri-server", "0.5.1-0ubuntu1", "noble", "questing", "Release")
        wrapper.queue_copy("kolibri-server", "0.5.1-0ubuntu1", "noble", "jammy", "Release")

        class MockBadRequest(Exception):
            pass

        call_count = 0

        def side_effect(**kwargs):
            nonlocal call_count
            call_count += 1
            if kwargs["to_series"] == "questing":
                raise MockBadRequest("source has no binaries to be copied")

        mock_ppa = MagicMock()
        mock_ppa.syncSources.side_effect = side_effect

        with patch("launchpad_copy.lre") as mock_lre:
            mock_lre.BadRequest = MockBadRequest
            result = wrapper.perform_queued_copies(mock_ppa)

        assert call_count == 2  # Both series were attempted
        assert result == 1  # Reports failure

    def test_perform_queued_copies_logs_already_published(self, caplog):
        """Idempotency: logs a message when syncSources finds package already exists."""
        wrapper = LaunchpadWrapper()
        wrapper.queue_copy("kolibri-server", "0.5.1-0ubuntu1", "jammy", "noble", "Release")

        class MockBadRequest(Exception):
            pass

        mock_ppa = MagicMock()
        mock_ppa.syncSources.side_effect = MockBadRequest(
            "kolibri-server 0.5.1-0ubuntu1 in noble (same version already published)"
        )

        with (
            patch("launchpad_copy.lre") as mock_lre,
            caplog.at_level(logging.INFO, logger=log.name),
        ):
            mock_lre.BadRequest = MockBadRequest
            wrapper.perform_queued_copies(mock_ppa)

        assert any("already" in r.message.lower() for r in caplog.records)

    def test_get_usable_sources_filters_by_whitelist(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()

        src_good = MagicMock()
        src_good.source_package_name = "kolibri-server"
        src_good.source_package_version = "1.0"
        src_good.status = "Published"

        src_bad = MagicMock()
        src_bad.source_package_name = "other-package"
        src_bad.source_package_version = "2.0"
        src_bad.status = "Published"

        with patch.object(wrapper, "get_published_sources", return_value=[src_good, src_bad]):
            result = wrapper.get_usable_sources(mock_ppa, ("kolibri-server",), "jammy")

        assert len(result) == 1
        assert result[0] == ("kolibri-server", "1.0")

    def test_get_usable_sources_skips_superseded(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()

        src = MagicMock()
        src.source_package_name = "kolibri-server"
        src.source_package_version = "1.0"
        src.status = "Superseded"

        with patch.object(wrapper, "get_published_sources", return_value=[src]):
            result = wrapper.get_usable_sources(mock_ppa, ("kolibri-server",), "jammy")

        assert len(result) == 0


# --- configure_logging tests ---


class TestConfigureLogging:
    """Test logging configuration based on parsed args."""

    def test_default_sets_info_level(self):
        parser = build_parser()
        args = parser.parse_args(["promote", "--version", "1.0"])
        log.handlers.clear()
        configure_logging(args)
        assert log.level == logging.INFO

    def test_quiet_sets_warning_level(self):
        parser = build_parser()
        args = parser.parse_args(["-q", "promote", "--version", "1.0"])
        log.handlers.clear()
        configure_logging(args)
        assert log.level == logging.WARNING

    def test_vv_sets_debug_level(self):
        parser = build_parser()
        args = parser.parse_args(["-vv", "promote", "--version", "1.0"])
        log.handlers.clear()
        configure_logging(args)
        assert log.level == logging.DEBUG


# --- promote subcommand tests ---


class TestPromote:
    """Test the promote logic on LaunchpadWrapper."""

    def test_copies_whitelisted_published_package(self):
        wrapper = LaunchpadWrapper()
        mock_source_ppa = MagicMock()
        mock_dest_ppa = MagicMock()

        mock_pkg = MagicMock()
        mock_pkg.source_package_name = "kolibri-server"
        mock_pkg.source_package_version = "0.9.0"
        mock_pkg.distro_series_link = "https://api.launchpad.net/1.0/ubuntu/jammy"
        mock_pkg.pocket = "Release"

        mock_source_ppa.getPublishedSources.return_value = [mock_pkg]

        with (
            patch.object(
                type(wrapper),
                "proposed_ppa",
                new_callable=lambda: property(lambda self: mock_source_ppa),
            ),
            patch.object(
                type(wrapper),
                "release_ppa",
                new_callable=lambda: property(lambda self: mock_dest_ppa),
            ),
        ):
            result = wrapper.promote(version="0.9.0")

        mock_dest_ppa.syncSources.assert_called_once_with(
            from_archive=mock_source_ppa,
            to_series="jammy",
            to_pocket="Release",
            include_binaries=True,
            source_names=["kolibri-server"],
        )
        assert result == 0

    def test_skips_non_whitelisted_package(self):
        wrapper = LaunchpadWrapper()
        mock_source_ppa = MagicMock()
        mock_dest_ppa = MagicMock()

        mock_pkg = MagicMock()
        mock_pkg.source_package_name = "other-package"

        mock_source_ppa.getPublishedSources.return_value = [mock_pkg]

        with (
            patch.object(
                type(wrapper),
                "proposed_ppa",
                new_callable=lambda: property(lambda self: mock_source_ppa),
            ),
            patch.object(
                type(wrapper),
                "release_ppa",
                new_callable=lambda: property(lambda self: mock_dest_ppa),
            ),
        ):
            result = wrapper.promote(version="0.9.0")

        mock_dest_ppa.syncSources.assert_not_called()
        assert result == 0

    def test_handles_already_published_package_gracefully(self):
        """Idempotency: promote skips packages already copied to dest PPA."""
        wrapper = LaunchpadWrapper()
        mock_source_ppa = MagicMock()
        mock_dest_ppa = MagicMock()

        mock_pkg = MagicMock()
        mock_pkg.source_package_name = "kolibri-server"
        mock_pkg.source_package_version = "0.9.0"
        mock_pkg.distro_series_link = "https://api.launchpad.net/1.0/ubuntu/jammy"
        mock_pkg.pocket = "Release"

        mock_source_ppa.getPublishedSources.return_value = [mock_pkg]

        class MockBadRequest(Exception):
            pass

        mock_dest_ppa.syncSources.side_effect = MockBadRequest(
            "kolibri-server 0.9.0 in jammy (same version already published in the target archive)"
        )

        with (
            patch.object(
                type(wrapper),
                "proposed_ppa",
                new_callable=lambda: property(lambda self: mock_source_ppa),
            ),
            patch.object(
                type(wrapper),
                "release_ppa",
                new_callable=lambda: property(lambda self: mock_dest_ppa),
            ),
            patch("launchpad_copy.lre") as mock_lre,
        ):
            mock_lre.BadRequest = MockBadRequest
            result = wrapper.promote(version="0.9.0")

        assert result == 0

    def test_already_published_logs_skip_message(self, caplog):
        """Idempotency: promote logs that a package was already promoted."""
        wrapper = LaunchpadWrapper()
        mock_source_ppa = MagicMock()
        mock_dest_ppa = MagicMock()

        mock_pkg = MagicMock()
        mock_pkg.source_package_name = "kolibri-server"
        mock_pkg.source_package_version = "0.9.0"
        mock_pkg.distro_series_link = "https://api.launchpad.net/1.0/ubuntu/jammy"
        mock_pkg.pocket = "Release"

        mock_source_ppa.getPublishedSources.return_value = [mock_pkg]

        class MockBadRequest(Exception):
            pass

        mock_dest_ppa.syncSources.side_effect = MockBadRequest(
            "kolibri-server 0.9.0 in jammy (same version already published in the target archive)"
        )

        with (
            patch.object(
                type(wrapper),
                "proposed_ppa",
                new_callable=lambda: property(lambda self: mock_source_ppa),
            ),
            patch.object(
                type(wrapper),
                "release_ppa",
                new_callable=lambda: property(lambda self: mock_dest_ppa),
            ),
            patch("launchpad_copy.lre") as mock_lre,
            caplog.at_level(logging.INFO, logger=log.name),
        ):
            mock_lre.BadRequest = MockBadRequest
            wrapper.promote(version="0.9.0")

        assert any("already published" in r.message.lower() for r in caplog.records)


# --- wait-for-published tests ---


class TestWaitForPublished:
    """Test LaunchpadWrapper.wait_for_published polling logic."""

    def setup_method(self):
        log.handlers.clear()

    def _make_binary(self, series="noble", status="Published"):
        b = MagicMock()
        b.status = status
        b.distro_arch_series_link = f"https://api.launchpad.net/1.0/ubuntu/{series}/amd64"
        return b

    def _make_source(self, series="noble", status="Published"):
        s = MagicMock()
        s.status = status
        s.distro_series_link = f"https://api.launchpad.net/1.0/ubuntu/{series}"
        return s

    def test_published_immediately_with_explicit_series(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        mock_ppa.getPublishedBinaries.return_value = [self._make_binary("noble")]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0]
            result = wrapper.wait_for_published("kolibri-server", "1.0", series=["noble"])

        assert result == 0

    def test_auto_discovers_series_from_sources(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        mock_ppa.getPublishedSources.return_value = [self._make_source("noble"), self._make_source("jammy")]
        mock_ppa.getPublishedBinaries.return_value = [self._make_binary("noble"), self._make_binary("jammy")]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0]
            result = wrapper.wait_for_published("kolibri-server", "1.0")

        assert result == 0

    def test_timeout_when_nothing_published(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        mock_ppa.getPublishedSources.return_value = []  # no sources found

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0, 1801]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_published("kolibri-server", "1.0", timeout=1800)

        assert result == 1

    def test_waits_for_specific_series(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        mock_ppa.getPublishedBinaries.side_effect = [
            [self._make_binary("noble")],
            [self._make_binary("noble"), self._make_binary("jammy")],
        ]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0, 100, 100]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_published("kolibri-server", "1.0", series=["noble", "jammy"])

        assert result == 0
        mock_time.sleep.assert_called()

    def test_ignores_non_published_binaries(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        pending = self._make_binary("noble", status="Pending")
        mock_ppa.getPublishedBinaries.return_value = [pending]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0, 1801]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_published("kolibri-server", "1.0", series=["noble"], timeout=1800)

        assert result == 1

    def test_uses_custom_ppa(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        mock_ppa.getPublishedBinaries.return_value = [self._make_binary("noble")]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa) as mock_get_ppa,
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0]
            # Pass explicit series to skip auto-discovery
            wrapper.wait_for_published("kolibri-server", "1.0", ppa_name="kolibri", series=["noble"])

        mock_get_ppa.assert_called_with("kolibri")

    def test_handles_obsolete_series_in_promote(self):
        wrapper = LaunchpadWrapper()
        mock_source_ppa = MagicMock()
        mock_dest_ppa = MagicMock()

        mock_pkg = MagicMock()
        mock_pkg.source_package_name = "kolibri-server"
        mock_pkg.source_package_version = "0.9.0"
        mock_pkg.distro_series_link = "https://api.launchpad.net/1.0/ubuntu/xenial"
        mock_pkg.pocket = "Release"

        mock_source_ppa.getPublishedSources.return_value = [mock_pkg]

        class MockBadRequest(Exception):
            pass

        mock_dest_ppa.syncSources.side_effect = MockBadRequest("xenial is obsolete and will not accept new uploads")

        with (
            patch.object(
                type(wrapper),
                "proposed_ppa",
                new_callable=lambda: property(lambda self: mock_source_ppa),
            ),
            patch.object(
                type(wrapper),
                "release_ppa",
                new_callable=lambda: property(lambda self: mock_dest_ppa),
            ),
            patch("launchpad_copy.lre") as mock_lre,
        ):
            mock_lre.BadRequest = MockBadRequest
            result = wrapper.promote(version="0.9.0")

        assert result == 0
