from django.contrib.auth import logout
from django.core.urlresolvers import reverse
from django.http import Http404
from django.http import HttpResponse
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from django.urls import is_valid_path
from django.urls import translate_url
from django.utils.decorators import method_decorator
from django.utils.six.moves.urllib.parse import urlsplit
from django.utils.six.moves.urllib.parse import urlunsplit
from django.utils.translation import check_for_language
from django.utils.translation import LANGUAGE_SESSION_KEY
from django.utils.translation import ugettext_lazy as _
from django.views.decorators.http import require_POST
from django.views.generic.base import TemplateView
from django.views.generic.base import View
from django.views.i18n import LANGUAGE_QUERY_PARAMETER

from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.models import Role
from kolibri.core.decorators import cache_no_user_data
from kolibri.core.device.hooks import SetupHook
from kolibri.core.device.translation import get_accept_headers_language
from kolibri.core.device.translation import get_device_language
from kolibri.core.device.translation import get_settings_language
from kolibri.core.device.utils import allow_guest_access
from kolibri.core.device.utils import device_provisioned
from kolibri.core.hooks import RoleBasedRedirectHook


# Modified from django.views.i18n
@require_POST
def set_language(request):
    """
    Since this view changes how the user will see the rest of the site, it must
    only be accessed as a POST request. If called as a GET request, it will
    error.
    """
    lang_code = request.POST.get(LANGUAGE_QUERY_PARAMETER)
    next_url = urlsplit(request.POST.get("next")) if request.POST.get("next") else None
    if lang_code and check_for_language(lang_code):
        if next_url and is_valid_path(next_url.path):
            # If it is a recognized Kolibri path, then translate it to the new language and return it.
            next_path = urlunsplit(
                (
                    next_url[0],
                    next_url[1],
                    translate_url(next_url[2], lang_code),
                    next_url[3],
                    next_url[4],
                )
            )
        else:
            next_path = translate_url(reverse("kolibri:core:redirect_user"), lang_code)
        response = HttpResponse(next_path)
        if hasattr(request, "session"):
            request.session[LANGUAGE_SESSION_KEY] = lang_code
    else:
        lang_code = (
            get_device_language()
            or get_accept_headers_language(request)
            or get_settings_language()
        )
        if next_url and is_valid_path(next_url.path):
            # If it is a recognized Kolibri path, then translate it using the default language code for this device
            next_path = urlunsplit(
                (
                    next_url[0],
                    next_url[1],
                    translate_url(next_url[2], lang_code),
                    next_url[3],
                    next_url[4],
                )
            )
        else:
            next_path = translate_url(reverse("kolibri:core:redirect_user"), lang_code)
        response = HttpResponse(next_path)
        if hasattr(request, "session"):
            request.session.pop(LANGUAGE_SESSION_KEY, "")
    return response


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("kolibri:core:redirect_user"))


def get_urls_by_role(role):
    for hook in RoleBasedRedirectHook.registered_hooks:
        if role in hook.roles:
            yield hook.url


def get_url_by_role(role, first_login):
    obj = next(
        (
            hook
            for hook in RoleBasedRedirectHook.registered_hooks
            if role in hook.roles and hook.first_login == first_login
        ),
        None,
    )

    if obj is None and first_login:
        # If it is the first_login, do a fallback to find the non-first login behaviour when it is
        # not available
        obj = next(
            (
                hook
                for hook in RoleBasedRedirectHook.registered_hooks
                if role in hook.roles and hook.first_login is False
            ),
            None,
        )

    if obj:
        return obj.url


class GuestRedirectView(View):
    def get(self, request):
        """
        Redirects a guest user to a learner accessible page.
        """
        if allow_guest_access():
            return HttpResponseRedirect(get_url_by_role(user_kinds.LEARNER, False))
        return RootURLRedirectView.as_view()(request)


device_is_provisioned = False


def is_provisioned():
    # First check if the device has been provisioned
    global device_is_provisioned
    device_is_provisioned = device_is_provisioned or device_provisioned()
    return device_is_provisioned


class RootURLRedirectView(View):
    def get(self, request):
        """
        Redirects user based on the highest role they have for which a redirect is defined.
        """
        # If it has not been provisioned and we have something that can handle setup, redirect there.
        if not is_provisioned():
            SETUP_WIZARD_URLS = [hook.url for hook in SetupHook.registered_hooks]
            if SETUP_WIZARD_URLS:
                return redirect(SETUP_WIZARD_URLS[0])

        # Device is provisioned, so resume usual service.
        first_login = request.session.get("first_login", False)
        if request.user.is_authenticated():
            url = None
            if request.user.is_superuser:
                url = url or get_url_by_role(user_kinds.SUPERUSER, first_login)
            roles = set(
                Role.objects.filter(user_id=request.user.id)
                .values_list("kind", flat=True)
                .distinct()
            )
            if user_kinds.ADMIN in roles:
                url = url or get_url_by_role(user_kinds.ADMIN, first_login)
            if user_kinds.COACH in roles:
                url = url or get_url_by_role(user_kinds.COACH, first_login)
            url = url or get_url_by_role(user_kinds.LEARNER, first_login)
        else:
            url = get_url_by_role(user_kinds.ANONYMOUS, first_login)
        if url:
            return HttpResponseRedirect(url)
        raise Http404(
            _(
                "No appropriate redirect pages found. It is likely that Kolibri is badly configured"
            )
        )


@method_decorator(cache_no_user_data, name="dispatch")
class UnsupportedBrowserView(TemplateView):
    template_name = "kolibri/unsupported_browser.html"


class StatusCheckView(View):
    def get(self, request):
        """
        Confirms that the server is up
        """
        return HttpResponse()
