from django.conf import settings
from django.contrib.auth import logout
from django.core.urlresolvers import reverse
from django.http import Http404
from django.http import HttpResponse
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from django.utils.decorators import method_decorator
from django.utils.translation import check_for_language
from django.utils.translation import LANGUAGE_SESSION_KEY
from django.utils.translation import ugettext_lazy as _
from django.views.generic.base import View
from django.views.i18n import LANGUAGE_QUERY_PARAMETER

from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.models import Role
from kolibri.core.decorators import signin_redirect_exempt
from kolibri.core.device.hooks import SetupHook
from kolibri.core.device.utils import device_provisioned
from kolibri.core.hooks import RoleBasedRedirectHook


# Modified from django.views.i18n
@signin_redirect_exempt
def set_language(request):
    """
    Since this view changes how the user will see the rest of the site, it must
    only be accessed as a POST request. If called as a GET request, it will
    redirect to the page in the request (the 'next' parameter) without changing
    any state.
    """
    if request.method == 'POST':
        response = HttpResponse(status=204)
        lang_code = request.POST.get(LANGUAGE_QUERY_PARAMETER)
        if lang_code and check_for_language(lang_code):
            if hasattr(request, 'session'):
                request.session[LANGUAGE_SESSION_KEY] = lang_code
            # Always set cookie
            response.set_cookie(settings.LANGUAGE_COOKIE_NAME, lang_code,
                                max_age=settings.LANGUAGE_COOKIE_AGE,
                                path=settings.LANGUAGE_COOKIE_PATH,
                                domain=settings.LANGUAGE_COOKIE_DOMAIN)
        else:
            if hasattr(request, 'session'):
                request.session.pop(LANGUAGE_SESSION_KEY, '')
            response.delete_cookie(settings.LANGUAGE_COOKIE_NAME)
        return response
    else:
        return HttpResponseRedirect(reverse('kolibri:core:redirect_user'))


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse('kolibri:core:redirect_user'))


def get_urls_by_role(role):
    for hook in RoleBasedRedirectHook().registered_hooks:
        if hook.role == role:
            yield hook.url


def get_url_by_role(role, first_login):
    obj = next((hook for hook in RoleBasedRedirectHook().registered_hooks
                if hook.role == role and hook.first_login == first_login), None)

    if obj is None and first_login:
        # If it is the first_login, do a fallback to find the non-first login behaviour when it is
        # not available
        obj = next((hook for hook in RoleBasedRedirectHook().registered_hooks
                    if hook.role == role and hook.first_login is False), None)

    if obj:
        return obj.url


class GuestRedirectView(View):
    def get(self, request):
        """
        Redirects a guest user to a learner accessible page.
        """
        return HttpResponseRedirect(get_url_by_role(user_kinds.LEARNER, False))


device_is_provisioned = False


def is_provisioned():
    # First check if the device has been provisioned
    global device_is_provisioned
    device_is_provisioned = device_is_provisioned or device_provisioned()
    return device_is_provisioned


@method_decorator(signin_redirect_exempt, name='dispatch')
class RootURLRedirectView(View):

    def get(self, request):
        """
        Redirects user based on the highest role they have for which a redirect is defined.
        """
        # If it has not been provisioned and we have something that can handle setup, redirect there.
        if not is_provisioned():
            SETUP_WIZARD_URLS = [hook.url for hook in SetupHook().registered_hooks]
            if SETUP_WIZARD_URLS:
                return redirect(SETUP_WIZARD_URLS[0])

        # Device is provisioned, so resume usual service.
        first_login = request.session.get("first_login", False)
        if request.user.is_authenticated():
            url = None
            if request.user.is_superuser:
                url = url or get_url_by_role(user_kinds.SUPERUSER, first_login)
            roles = set(Role.objects.filter(user_id=request.user.id).values_list('kind', flat=True).distinct())
            if user_kinds.ADMIN in roles:
                url = url or get_url_by_role(user_kinds.ADMIN, first_login)
            if user_kinds.COACH in roles:
                url = url or get_url_by_role(user_kinds.COACH, first_login)
            url = url or get_url_by_role(user_kinds.LEARNER, first_login)
        else:
            url = get_url_by_role(user_kinds.ANONYMOUS, first_login)
        if url:
            return HttpResponseRedirect(url)
        raise Http404(_("No appropriate redirect pages found. It is likely that Kolibri is badly configured"))
