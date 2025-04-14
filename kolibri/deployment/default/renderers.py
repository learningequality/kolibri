from rest_framework.renderers import BrowsableAPIRenderer


class LightBrowsableAPIRenderer(BrowsableAPIRenderer):
    """
    Custom browsable API renderer that removes filtering and POST forms
    for better performance with Django Debug Toolbar.
    """

    def get_filter_form(self, data, view, request):
        """
        Don't render the filter form.
        """
        return None

    def get_rendered_html_form(self, data, view, method, request):
        """
        Don't render the HTML form.
        """
        return None

    def get_context(self, data, accepted_media_type, renderer_context):
        """
        Modify context to remove unnecessary components.
        """
        context = super().get_context(data, accepted_media_type, renderer_context)

        # Remove form-related context
        context["display_edit_forms"] = False
        context["raw_data_post_form"] = None
        context["raw_data_put_form"] = None
        context["raw_data_patch_form"] = None
        context["raw_data_put_or_patch_form"] = None

        return context
