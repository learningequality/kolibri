from copy import copy

from kolibri.utils.env import forward_port_cgi_module
from kolibri.utils.env import monkey_patch_base_context


def test_base_context_copy_works_after_monkey_patch():
    """
    Verify that Django's BaseContext.__copy__ works after monkey-patching.
    On Python 3.14+, the original Django 3.2 implementation fails because
    super() objects no longer support __dict__ attribute setting.
    """
    forward_port_cgi_module()
    monkey_patch_base_context()

    from django.template.context import BaseContext

    ctx = BaseContext({"foo": "bar"})
    ctx_copy = copy(ctx)
    assert ctx_copy.dicts == ctx.dicts
    assert ctx_copy.dicts is not ctx.dicts  # Must be a shallow copy, not same list


def test_request_context_copy_works_after_monkey_patch():
    """
    Verify that RequestContext (which requires a request argument in __init__)
    can be copied after monkey-patching.
    """
    forward_port_cgi_module()
    monkey_patch_base_context()

    from django.template.context import RequestContext
    from django.test import RequestFactory

    factory = RequestFactory()
    request = factory.get("/")
    ctx = RequestContext(request, {"foo": "bar"})
    ctx_copy = copy(ctx)
    assert ctx_copy.dicts == ctx.dicts
    assert ctx_copy.dicts is not ctx.dicts
    assert ctx_copy.request is request  # __dict__ attributes must survive copy
