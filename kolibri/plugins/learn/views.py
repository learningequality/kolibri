from django.views.generic.base import TemplateView

from kolibri.core.decorators import cache_no_user_data


@cache_no_user_data
class LearnView(TemplateView):
    template_name = "learn/learn.html"


@cache_no_user_data
class MyDownloadsView(TemplateView):
    template_name = "learn/my_downloads.html"
