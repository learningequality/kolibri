from django.templatetags.static import static
from django.utils.safestring import mark_safe

from kolibri.core.hooks import FrontEndBaseHeadHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class ContextTranslationPlugin(KolibriPluginBase):
    """
    A plugin to enable support for translating the user interface of Kolibri
    using Crowdin's in-context translation feature.
    """

    kolibri_option_defaults = "option_defaults"
    django_settings = "settings"


@register_hook
class JIPTHeadHook(FrontEndBaseHeadHook):
    @property
    def head_html(self):
        js_url = static("assets/context_translation/jipt.js")
        return mark_safe(
            "\n".join(
                [
                    f"""<script type="text/javascript" src="{js_url}"></script>""",
                    """<script type="text/javascript" src="https://cdn.crowdin.com/jipt/jipt.js"></script>""",
                ]
            )
        )
