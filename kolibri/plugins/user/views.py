from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.views.generic.base import TemplateView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from kolibri.core.decorators import cache_no_user_data

@method_decorator(cache_no_user_data, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class UserView(TemplateView):
    template_name = "user/user.html"
