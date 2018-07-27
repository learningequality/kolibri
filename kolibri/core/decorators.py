from functools import wraps


def signin_redirect_exempt(view_func):
    """Mark a view function as being exempt from the signin page redirect"""
    def wrapped_view(*args, **kwargs):
        return view_func(*args, **kwargs)
    wrapped_view.signin_redirect_exempt = True
    return wraps(view_func)(wrapped_view)
