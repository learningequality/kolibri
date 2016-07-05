
from .content_db_router import get_active_content_database, set_active_content_database


class ContentDBRoutingMiddleware(object):
    """
    If a channel ID was included in the URL, ensure the appropriate content DB is used for the duration of the request.
    (Note: `set_active_content_database` is thread-local, so this shouldn't interfere with other parallel requests.)
    """

    def process_view(self, request, view_func, view_args, view_kwargs):
        request.PREVIOUSLY_ACTIVE_CONTENT_DATABASE = get_active_content_database(return_none_if_not_set=True)
        if "channel_id" in view_kwargs:
            set_active_content_database(view_kwargs["channel_id"])

    def process_response(self, request, response):
        set_active_content_database(getattr(request, "PREVIOUSLY_ACTIVE_CONTENT_DATABASE", None))
        return response
