from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect
from django.views.generic.base import View


class RootURLRedirectView(View):

    def get(self, request):
        """
        Redirects user to learn page if they are logged in, else redirects to sign in/sign up page.
        """
        if request.user.is_authenticated():
            return HttpResponseRedirect(reverse('kolibri:learnplugin:learn'))
        return HttpResponseRedirect(reverse('kolibri:user:user'))
