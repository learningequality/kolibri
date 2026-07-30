import os

import pytest

from build_tools.i18n.cleanup_unsupported_languages import ANDROID_LOCALE_QUALIFIER
from build_tools.i18n.cleanup_unsupported_languages import cleanup_targets
from build_tools.i18n.cleanup_unsupported_languages import prune_locale_dirs


def _path(root, relpath):
    # The module builds its paths with os.path.join/glob, so a forward-slash literal
    # would not compare equal to them on Windows.
    return os.path.join(root, *relpath.split("/"))


def _make_dirs(root, *relpaths):
    for relpath in relpaths:
        os.makedirs(_path(root, relpath))


def test_prune_removes_unsupported_and_keeps_supported(tmp_path):
    locale_dir = str(tmp_path)
    _make_dirs(locale_dir, "en", "fr_FR", "tr_TR", "kaa")

    removed = prune_locale_dirs(locale_dir, {"en", "fr_FR"})

    assert removed == ["kaa", "tr_TR"]
    assert sorted(os.listdir(locale_dir)) == ["en", "fr_FR"]


def test_prune_ignores_files(tmp_path):
    locale_dir = str(tmp_path)
    _make_dirs(locale_dir, "fr_FR")
    open(os.path.join(locale_dir, "language_info.json"), "w").close()

    assert prune_locale_dirs(locale_dir, {"fr_FR"}) == []
    assert os.path.exists(os.path.join(locale_dir, "language_info.json"))


def test_prune_with_pattern_only_touches_locale_qualifiers(tmp_path):
    # values- prefixes every Android resource qualifier, not just locales. Pruning
    # must reach the unsupported locale and nothing else — a deleted values-night or
    # values-v21 would ride out unnoticed in the auto-generated translation PR.
    res_dir = str(tmp_path)
    _make_dirs(
        res_dir,
        "values",
        "values-fr-rFR",
        "values-b+es+419",
        "values-tr-rTR",
        "values-night",
        "values-v21",
        "values-sw600dp",
        "values-land",
        # UI-mode qualifiers that are also ISO 639 codes, so shape alone can't tell
        # them from a locale.
        "values-car",
        "values-tv",
        "drawable",
        "xml",
    )

    removed = prune_locale_dirs(
        res_dir, {"fr-rFR", "b+es+419"}, pattern=ANDROID_LOCALE_QUALIFIER
    )

    assert removed == ["values-tr-rTR"]
    assert sorted(os.listdir(res_dir)) == [
        "drawable",
        "values",
        "values-b+es+419",
        "values-car",
        "values-fr-rFR",
        "values-land",
        "values-night",
        "values-sw600dp",
        "values-tv",
        "values-v21",
        "xml",
    ]


def test_prune_missing_directory_is_noop(tmp_path):
    assert prune_locale_dirs(os.path.join(str(tmp_path), "nope"), {"en"}) == []


@pytest.fixture
def repo_root(tmp_path):
    # Deliberately NOT the plugins/platforms this repo currently ships: discovery
    # has to work for whatever is added next, not for a hardcoded inventory.
    root = str(tmp_path)
    _make_dirs(
        root,
        "kolibri/locale",
        "python_packages/kolibri-imaginary-plugin/kolibri_imaginary_plugin/locale",
        "python_packages/kolibri-notyet-plugin/kolibri_notyet_plugin/locale",
        "platforms/handheld-app/src/handheld_app/locales",
        "platforms/handheld-app/installer/translations/locale",
        "platforms/pocket-os/app/src/main/res/values",
    )
    return root


def _target_dirs(repo_root):
    return {directory for directory, _, _ in cleanup_targets(repo_root)}


def _target_for(repo_root, relpath):
    return next(
        (supported, pattern)
        for directory, supported, pattern in cleanup_targets(repo_root)
        if directory == _path(repo_root, relpath)
    )


def test_cleanup_targets_discovers_trees_by_shape_not_by_name(repo_root):
    targets = _target_dirs(repo_root)

    for expected in (
        "kolibri/locale",
        "python_packages/kolibri-imaginary-plugin/kolibri_imaginary_plugin/locale",
        "python_packages/kolibri-notyet-plugin/kolibri_notyet_plugin/locale",
        "platforms/handheld-app/src/handheld_app/locales",
        "platforms/handheld-app/installer/translations/locale",
        "platforms/pocket-os/app/src/main/res",
    ):
        assert _path(repo_root, expected) in targets


@pytest.mark.parametrize(
    "relpath",
    [
        "python_packages/kolibri-imaginary-plugin/node_modules/dep/locale",
        # p4a unpacks a full CPython under android_root/, so Django's own catalogs
        # sit here in any checkout where the APK has been built.
        "platforms/android/android_root/python-install/lib/python3.9/"
        "site-packages/django/conf/locale",
        "platforms/handheld-app/build/lib/handheld_app/locales",
        "platforms/android/tar/extracted/kolibri-0.19/kolibri/locale",
    ],
)
def test_untracked_build_output_is_left_alone(repo_root, relpath):
    _make_dirs(repo_root, relpath)
    targets = _target_dirs(repo_root)

    assert _path(repo_root, relpath) not in targets
    # Guard the assertion above against passing vacuously: whatever shape paths
    # compare in on this platform, a real root is still discovered.
    assert _path(repo_root, "kolibri/locale") in targets


def test_excluded_names_only_match_below_the_repo_root(tmp_path):
    # A checkout can itself sit under an excluded name (~/build/kolibri, /srv/dist/kolibri).
    # Matching the whole path there would drop every glob-discovered root — silently,
    # and for exactly the trees this script exists to prune.
    root = _path(str(tmp_path), "build/kolibri")
    plugin_locale = (
        "python_packages/kolibri-imaginary-plugin/kolibri_imaginary_plugin/locale"
    )
    _make_dirs(root, plugin_locale, "platforms/pocket-os/app/src/main/res/values")

    targets = _target_dirs(root)

    assert _path(root, plugin_locale) in targets
    assert _path(root, "platforms/pocket-os/app/src/main/res") in targets


def test_staged_android_res_is_left_alone(repo_root):
    _make_dirs(repo_root, "platforms/android/build/intermediates/res/values")
    targets = _target_dirs(repo_root)

    assert _path(repo_root, "platforms/android/build/intermediates/res") not in targets
    assert _path(repo_root, "platforms/pocket-os/app/src/main/res") in targets


def test_plain_locale_dirs_accept_any_configured_convention(repo_root):
    # A path's shape does not reveal which locale-code convention its tree uses
    # (gettext es_ES vs the installer's es-es), so plain locale dirs accept both.
    supported, pattern = _target_for(repo_root, "kolibri/locale")

    assert pattern is None
    assert {"es_ES", "es-es"} <= supported


def test_android_res_prunes_values_qualifiers(repo_root):
    supported, pattern = _target_for(repo_root, "platforms/pocket-os/app/src/main/res")

    assert pattern is ANDROID_LOCALE_QUALIFIER
    assert {"es-rES", "b+es+419"} <= supported


def test_supported_sets_are_not_everything(repo_root):
    # Canary on the mapping generators: `kaa` is one of the languages the Crowdin
    # download delivered beyond Kolibri's set, so a supported set that contains it is
    # a set that would prune nothing.
    for _, supported, _ in cleanup_targets(repo_root):
        assert "kaa" not in supported
