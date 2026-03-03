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
from launchpad_copy import get_supported_series
from launchpad_copy import log
from launchpad_copy import main

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
        args = parser.parse_args(["promote"])
        assert args.command == "promote"

    def test_subcommand_required(self):
        parser = build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args([])

    def test_wait_for_builds_subcommand_parsed(self):
        parser = build_parser()
        args = parser.parse_args(["wait-for-builds", "--package", "kolibri-server", "--version", "1.0"])
        assert args.command == "wait-for-builds"

    def test_wait_for_builds_package_required(self):
        parser = build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(["wait-for-builds", "--version", "1.0"])

    def test_wait_for_builds_version_required(self):
        parser = build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(["wait-for-builds", "--package", "kolibri-server"])

    def test_wait_for_builds_ppa_defaults_to_kolibri_proposed(self):
        parser = build_parser()
        args = parser.parse_args(["wait-for-builds", "--package", "kolibri-server", "--version", "1.0"])
        assert args.ppa == "kolibri-proposed"

    def test_wait_for_builds_timeout_defaults_to_1800(self):
        parser = build_parser()
        args = parser.parse_args(["wait-for-builds", "--package", "kolibri-server", "--version", "1.0"])
        assert args.timeout == 1800

    def test_wait_for_builds_interval_defaults_to_60(self):
        parser = build_parser()
        args = parser.parse_args(["wait-for-builds", "--package", "kolibri-server", "--version", "1.0"])
        assert args.interval == 60

    def test_wait_for_builds_custom_timeout_and_interval(self):
        parser = build_parser()
        args = parser.parse_args(
            [
                "wait-for-builds",
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

    def test_wait_for_builds_custom_ppa(self):
        parser = build_parser()
        args = parser.parse_args(
            [
                "wait-for-builds",
                "--package",
                "kolibri-server",
                "--version",
                "1.0",
                "--ppa",
                "kolibri",
            ]
        )
        assert args.ppa == "kolibri"

    def test_quiet_flag(self):
        parser = build_parser()
        args = parser.parse_args(["-q", "promote"])
        assert args.quiet is True

    def test_debug_flag(self):
        parser = build_parser()
        args = parser.parse_args(["--debug", "promote"])
        assert args.debug is True


# --- Series discovery tests ---

has_lsb_release = shutil.which("lsb_release") is not None
has_ubuntu_distro_info = shutil.which("ubuntu-distro-info") is not None


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


@pytest.mark.skipif(
    not has_ubuntu_distro_info,
    reason="ubuntu-distro-info not available on this system",
)
class TestGetSupportedSeries:
    """Test dynamic series discovery using real ubuntu-distro-info."""

    def test_returns_list_of_series(self):
        result = get_supported_series("jammy")
        assert isinstance(result, list)
        assert len(result) > 0

    def test_excludes_source_series(self):
        result = get_supported_series("jammy")
        assert "jammy" not in result

    def test_all_entries_are_non_empty_strings(self):
        result = get_supported_series("jammy")
        for s in result:
            assert isinstance(s, str)
            assert len(s) > 0

    def test_raises_on_missing_command(self):
        with patch("subprocess.check_output", side_effect=FileNotFoundError("no cmd")):
            with pytest.raises(FileNotFoundError):
                get_supported_series("jammy")


# --- LaunchpadWrapper tests ---


class TestLaunchpadWrapper:
    """Test LaunchpadWrapper queue and filtering logic."""

    def test_queue_copy_accumulates_names(self):
        wrapper = LaunchpadWrapper()
        wrapper.queue_copy("kolibri-server", "jammy", "noble", "Release")
        wrapper.queue_copy("kolibri-server", "jammy", "focal", "Release")

        assert ("jammy", "noble", "Release") in wrapper.queue
        assert ("jammy", "focal", "Release") in wrapper.queue
        assert "kolibri-server" in wrapper.queue[("jammy", "noble", "Release")]

    def test_queue_starts_empty(self):
        wrapper = LaunchpadWrapper()
        assert len(wrapper.queue) == 0

    def test_perform_queued_copies_calls_sync_sources(self):
        wrapper = LaunchpadWrapper()
        wrapper.queue_copy("kolibri-server", "jammy", "noble", "Release")

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

    def test_perform_queued_copies_handles_already_synced(self):
        """Idempotency: syncSources errors for already-copied packages are handled gracefully."""
        wrapper = LaunchpadWrapper()
        wrapper.queue_copy("kolibri-server", "jammy", "noble", "Release")

        class MockBadRequest(Exception):
            pass

        mock_ppa = MagicMock()
        mock_ppa.syncSources.side_effect = MockBadRequest(
            "kolibri-server 0.9.0 in noble (same version already published)"
        )

        with patch("launchpad_copy.lre") as mock_lre:
            mock_lre.BadRequest = MockBadRequest
            wrapper.perform_queued_copies(mock_ppa)

        # Should not raise — the error is handled gracefully

    def test_perform_queued_copies_logs_already_synced(self, caplog):
        """Idempotency: logs a message when syncSources finds package already exists."""
        wrapper = LaunchpadWrapper()
        wrapper.queue_copy("kolibri-server", "jammy", "noble", "Release")

        class MockBadRequest(Exception):
            pass

        mock_ppa = MagicMock()
        mock_ppa.syncSources.side_effect = MockBadRequest(
            "kolibri-server 0.9.0 in noble (same version already published)"
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
            result = LaunchpadWrapper.get_usable_sources.__wrapped__(wrapper, mock_ppa, ("kolibri-server",), "jammy")

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
            result = LaunchpadWrapper.get_usable_sources.__wrapped__(wrapper, mock_ppa, ("kolibri-server",), "jammy")

        assert len(result) == 0


# --- configure_logging tests ---


class TestConfigureLogging:
    """Test logging configuration based on parsed args."""

    def test_default_sets_info_level(self):
        parser = build_parser()
        args = parser.parse_args(["promote"])
        log.handlers.clear()
        configure_logging(args)
        assert log.level == logging.INFO

    def test_quiet_sets_warning_level(self):
        parser = build_parser()
        args = parser.parse_args(["-q", "promote"])
        log.handlers.clear()
        configure_logging(args)
        assert log.level == logging.WARNING

    def test_vv_sets_debug_level(self):
        parser = build_parser()
        args = parser.parse_args(["-vv", "promote"])
        log.handlers.clear()
        configure_logging(args)
        assert log.level == logging.DEBUG


# --- main / subcommand dispatch tests ---


class TestMainDispatch:
    """Test that main dispatches to the correct subcommand."""

    def test_dispatches_to_copy_to_series(self):

        with (
            patch("launchpad_copy.cmd_copy_to_series", return_value=0) as mock_cmd,
            patch("sys.argv", ["launchpad_copy.py", "copy-to-series"]),
        ):
            result = main()

        mock_cmd.assert_called_once()
        assert result == 0

    def test_dispatches_to_wait_for_builds(self):
        with (
            patch("launchpad_copy.cmd_wait_for_builds", return_value=0) as mock_cmd,
            patch(
                "sys.argv",
                [
                    "launchpad_copy.py",
                    "wait-for-builds",
                    "--package",
                    "kolibri-server",
                    "--version",
                    "1.0",
                ],
            ),
        ):
            result = main()

        mock_cmd.assert_called_once()
        assert result == 0

    def test_dispatches_to_promote(self):

        with (
            patch("launchpad_copy.cmd_promote", return_value=0) as mock_cmd,
            patch("sys.argv", ["launchpad_copy.py", "promote"]),
        ):
            result = main()

        mock_cmd.assert_called_once()
        assert result == 0


# --- copy-to-series subcommand tests ---


class TestCopyToSeries:
    """Test the copy-to-series logic on LaunchpadWrapper."""

    def test_queues_copy_for_missing_package(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()

        with (
            patch.object(
                type(wrapper),
                "proposed_ppa",
                new_callable=lambda: property(lambda self: mock_ppa),
            ),
            patch.object(
                wrapper,
                "get_usable_sources",
                return_value=[("kolibri-server", "0.9.0")],
            ),
            patch.object(wrapper, "get_source_for", return_value=None),
            patch.object(wrapper, "has_published_binaries", return_value=True),
            patch("launchpad_copy.get_current_series", return_value="jammy"),
            patch("launchpad_copy.get_supported_series", return_value=["noble"]),
        ):
            wrapper.copy_to_series()

        assert ("jammy", "noble", "Release") in wrapper.queue
        assert "kolibri-server" in wrapper.queue[("jammy", "noble", "Release")]

    def test_skips_copy_when_not_built_yet(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()

        mock_build = MagicMock()
        mock_build.buildstate = "Currently building"
        mock_build.web_link = "https://example.com"

        with (
            patch.object(
                type(wrapper),
                "proposed_ppa",
                new_callable=lambda: property(lambda self: mock_ppa),
            ),
            patch.object(
                wrapper,
                "get_usable_sources",
                return_value=[("kolibri-server", "0.9.0")],
            ),
            patch.object(wrapper, "get_source_for", return_value=None),
            patch.object(wrapper, "has_published_binaries", return_value=False),
            patch.object(wrapper, "get_builds_for", return_value=[mock_build]),
            patch("launchpad_copy.get_current_series", return_value="jammy"),
            patch("launchpad_copy.get_supported_series", return_value=["noble"]),
        ):
            wrapper.copy_to_series()

        assert len(wrapper.queue) == 0

    def test_returns_zero(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()

        with (
            patch.object(
                type(wrapper),
                "proposed_ppa",
                new_callable=lambda: property(lambda self: mock_ppa),
            ),
            patch.object(wrapper, "get_usable_sources", return_value=[]),
            patch("launchpad_copy.get_current_series", return_value="jammy"),
            patch("launchpad_copy.get_supported_series", return_value=[]),
        ):
            result = wrapper.copy_to_series()

        assert result == 0


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
        mock_pkg.distro_series_link = "https://lp/ubuntu/jammy"
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
            result = wrapper.promote()

        mock_dest_ppa.copyPackage.assert_called_once_with(
            from_archive=mock_source_ppa,
            include_binaries=True,
            to_pocket="Release",
            source_name="kolibri-server",
            version="0.9.0",
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
            result = wrapper.promote()

        mock_dest_ppa.copyPackage.assert_not_called()
        assert result == 0

    def test_handles_already_published_package_gracefully(self):
        """Idempotency: promote skips packages already copied to dest PPA."""
        wrapper = LaunchpadWrapper()
        mock_source_ppa = MagicMock()
        mock_dest_ppa = MagicMock()

        mock_pkg = MagicMock()
        mock_pkg.source_package_name = "kolibri-server"
        mock_pkg.source_package_version = "0.9.0"
        mock_pkg.distro_series_link = "https://lp/ubuntu/jammy"
        mock_pkg.pocket = "Release"

        mock_source_ppa.getPublishedSources.return_value = [mock_pkg]

        class MockBadRequest(Exception):
            pass

        mock_dest_ppa.copyPackage.side_effect = MockBadRequest(
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
            result = wrapper.promote()

        assert result == 0

    def test_already_published_logs_skip_message(self, caplog):
        """Idempotency: promote logs that a package was already promoted."""
        wrapper = LaunchpadWrapper()
        mock_source_ppa = MagicMock()
        mock_dest_ppa = MagicMock()

        mock_pkg = MagicMock()
        mock_pkg.source_package_name = "kolibri-server"
        mock_pkg.source_package_version = "0.9.0"
        mock_pkg.distro_series_link = "https://lp/ubuntu/jammy"
        mock_pkg.pocket = "Release"

        mock_source_ppa.getPublishedSources.return_value = [mock_pkg]

        class MockBadRequest(Exception):
            pass

        mock_dest_ppa.copyPackage.side_effect = MockBadRequest(
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
            wrapper.promote()

        assert any("already published" in r.message.lower() and "kolibri-server" in r.message for r in caplog.records)


# --- wait-for-builds tests ---


class TestWaitForBuilds:
    """Test LaunchpadWrapper.wait_for_builds polling logic."""

    def setup_method(self):
        log.handlers.clear()

    def _make_source(self, name="kolibri-server", version="1.0", status="Published"):
        src = MagicMock()
        src.source_package_name = name
        src.source_package_version = version
        src.status = status
        return src

    def _make_build(self, state="Successfully built", arch="amd64"):
        build = MagicMock()
        build.buildstate = state
        build.arch_tag = arch
        build.web_link = f"https://launchpad.net/build/{arch}"
        return build

    def test_source_appears_immediately(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        source = self._make_source()
        build = self._make_build("Successfully built")
        source.getBuilds.return_value = [build]
        mock_ppa.getPublishedSources.return_value = [source]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_builds("kolibri-server", "1.0")

        assert result == 0

    def test_timeout_when_source_never_appears(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        mock_ppa.getPublishedSources.return_value = []

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0, 1801]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_builds("kolibri-server", "1.0", timeout=1800)

        assert result == 1

    def test_source_appears_after_retry(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        source = self._make_source()
        build = self._make_build("Successfully built")
        source.getBuilds.return_value = [build]
        mock_ppa.getPublishedSources.side_effect = [[], [source]]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 100, 100, 100]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_builds("kolibri-server", "1.0")

        assert result == 0
        mock_time.sleep.assert_called()

    def test_filters_deleted_and_superseded_sources(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        deleted = self._make_source(status="Deleted")
        superseded = self._make_source(status="Superseded")
        mock_ppa.getPublishedSources.return_value = [deleted, superseded]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0, 1801]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_builds("kolibri-server", "1.0", timeout=1800)

        assert result == 1  # treated as not found

    def test_all_builds_succeed(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        source = self._make_source()
        build1 = self._make_build("Successfully built", "amd64")
        build2 = self._make_build("Successfully built", "arm64")
        source.getBuilds.return_value = [build1, build2]
        mock_ppa.getPublishedSources.return_value = [source]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_builds("kolibri-server", "1.0")

        assert result == 0

    def test_checks_all_build_records(self):
        """Acceptance criterion: checks all build records, not just the first."""
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        source = self._make_source()
        build_ok = self._make_build("Successfully built", "amd64")
        build_fail = self._make_build("Failed to build", "arm64")
        source.getBuilds.return_value = [build_ok, build_fail]
        mock_ppa.getPublishedSources.return_value = [source]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_builds("kolibri-server", "1.0")

        assert result == 1

    def test_build_failure_returns_nonzero(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        source = self._make_source()
        build = self._make_build("Failed to build", "amd64")
        source.getBuilds.return_value = [build]
        mock_ppa.getPublishedSources.return_value = [source]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_builds("kolibri-server", "1.0")

        assert result == 1

    def test_builds_complete_after_retry(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        source = self._make_source()
        building = self._make_build("Currently building", "amd64")
        built = self._make_build("Successfully built", "amd64")
        source.getBuilds.side_effect = [[building], [built]]
        mock_ppa.getPublishedSources.return_value = [source]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0, 0, 100, 100]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_builds("kolibri-server", "1.0")

        assert result == 0
        mock_time.sleep.assert_called()

    def test_build_timeout(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        source = self._make_source()
        building = self._make_build("Currently building", "amd64")
        source.getBuilds.return_value = [building]
        mock_ppa.getPublishedSources.return_value = [source]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0, 0, 1801]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_builds("kolibri-server", "1.0", timeout=1800)

        assert result == 1

    def test_multiple_sources_all_checked(self):
        """After copy-to-series, multiple sources exist across series."""
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        source1 = self._make_source()
        source2 = self._make_source()
        build1 = self._make_build("Successfully built", "amd64")
        build2 = self._make_build("Successfully built", "amd64")
        source1.getBuilds.return_value = [build1]
        source2.getBuilds.return_value = [build2]
        mock_ppa.getPublishedSources.return_value = [source1, source2]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_builds("kolibri-server", "1.0")

        assert result == 0
        source1.getBuilds.assert_called()
        source2.getBuilds.assert_called()

    def test_no_builds_yet_keeps_waiting(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        source = self._make_source()
        built = self._make_build("Successfully built", "amd64")
        source.getBuilds.side_effect = [[], [built]]
        mock_ppa.getPublishedSources.return_value = [source]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0, 0, 100, 100]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_builds("kolibri-server", "1.0")

        assert result == 0

    def test_logs_progress(self, caplog):
        """Acceptance criterion: logs progress like 'Waiting for builds: 2/3 complete, 1 building...'"""
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        source = self._make_source()
        build1 = self._make_build("Successfully built", "amd64")
        build2 = self._make_build("Currently building", "arm64")
        build3 = self._make_build("Successfully built", "i386")
        built2 = self._make_build("Successfully built", "arm64")
        source.getBuilds.side_effect = [[build1, build2, build3], [build1, built2, build3]]
        mock_ppa.getPublishedSources.return_value = [source]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa),
            patch("launchpad_copy.time") as mock_time,
            caplog.at_level(logging.INFO, logger=log.name),
        ):
            mock_time.time.side_effect = [0, 0, 0, 0, 100, 100]
            mock_time.sleep = MagicMock()
            result = wrapper.wait_for_builds("kolibri-server", "1.0")

        assert result == 0
        assert any("2/3 complete" in r.message and "1 building" in r.message for r in caplog.records)

    def test_uses_custom_ppa(self):
        wrapper = LaunchpadWrapper()
        mock_ppa = MagicMock()
        source = self._make_source()
        build = self._make_build("Successfully built")
        source.getBuilds.return_value = [build]
        mock_ppa.getPublishedSources.return_value = [source]

        with (
            patch.object(wrapper, "get_ppa", return_value=mock_ppa) as mock_get_ppa,
            patch("launchpad_copy.time") as mock_time,
        ):
            mock_time.time.side_effect = [0, 0, 0]
            mock_time.sleep = MagicMock()
            wrapper.wait_for_builds("kolibri-server", "1.0", ppa_name="kolibri")

        mock_get_ppa.assert_called_with("kolibri")

    def test_handles_obsolete_series_gracefully(self):
        wrapper = LaunchpadWrapper()
        mock_source_ppa = MagicMock()
        mock_dest_ppa = MagicMock()

        mock_pkg = MagicMock()
        mock_pkg.source_package_name = "kolibri-server"
        mock_pkg.source_package_version = "0.9.0"
        mock_pkg.distro_series_link = "https://lp/ubuntu/xenial"
        mock_pkg.pocket = "Release"

        mock_source_ppa.getPublishedSources.return_value = [mock_pkg]

        class MockBadRequest(Exception):
            pass

        mock_dest_ppa.copyPackage.side_effect = MockBadRequest("xenial is obsolete and will not accept new uploads")

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
            result = wrapper.promote()

        assert result == 0
