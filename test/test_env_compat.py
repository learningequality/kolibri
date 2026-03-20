import pkgutil
from copy import copy

import pytest

from kolibri.utils.env import forward_port_cgi_module
from kolibri.utils.env import monkey_patch_base_context
from kolibri.utils.env import monkey_patch_pkgutil


@pytest.fixture(autouse=True)
def _apply_patches():
    forward_port_cgi_module()
    monkey_patch_pkgutil()
    monkey_patch_base_context()


def test_base_context_copy_works_after_monkey_patch():
    """
    Verify that Django's BaseContext.__copy__ works after monkey-patching.
    On Python 3.14+, the original Django 3.2 implementation fails because
    super() objects no longer support __dict__ attribute setting.
    """
    from django.template.context import BaseContext

    ctx = BaseContext({"foo": "bar"})
    ctx_copy = copy(ctx)
    assert ctx_copy.dicts == ctx.dicts
    assert ctx_copy.dicts is not ctx.dicts  # Must be a shallow copy, not same list


def test_base_context_copy_preserves_dict_attributes_after_monkey_patch():
    """
    Verify that __dict__ attributes (like RequestContext.request) survive copy
    after monkey-patching.
    """
    from django.template.context import BaseContext

    ctx = BaseContext({"foo": "bar"})
    sentinel = object()
    ctx.custom_attr = sentinel
    ctx_copy = copy(ctx)
    assert ctx_copy.dicts == ctx.dicts
    assert ctx_copy.dicts is not ctx.dicts
    assert ctx_copy.custom_attr is sentinel  # __dict__ attributes must survive copy


def test_pkgutil_find_loader_finds_installed_package():
    """
    Verify that pkgutil.find_loader works after monkey-patching on Python 3.14+.
    django-filter uses pkgutil.find_loader('rest_framework') at import time.
    """
    loader = pkgutil.find_loader("kolibri")
    assert loader is not None


def test_pkgutil_find_loader_returns_none_for_missing_package():
    """
    Verify that pkgutil.find_loader returns None for a missing package.
    """
    loader = pkgutil.find_loader("nonexistent_package_xyz_12345")
    assert loader is None
