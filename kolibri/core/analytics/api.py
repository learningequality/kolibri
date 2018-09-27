from django.http import HttpResponse
from django.http import HttpResponseNotFound
from rest_framework.decorators import api_view

from kolibri.core.analytics.middleware import MetricsMiddleware

def get_client_ip(request):
    """
    Returns the ip of the client doing the request and its IP version
    """
    proxy = request.META.get('HTTP_X_FORWARDED_FOR')
    if proxy is not None:
        client_ip = [ip.strip() for ip in proxy.split(',')]
    else:
        client_ip = request.META['REMOTE_ADDR']
    version = 'IPv6' if ':' in client_ip else 'IPv4'
    return (client_ip, version)


@api_view(['GET'])
def activate_requests_profiling(request, pid):
    """
    Important: being kolibri thread-safe, this will
    activate the middleware only in the current process.
    Other kolibri threads won't be affected
    """
    client_ip, _ = get_client_ip(request)
    local_request = client_ip == '127.0.0.1' or client_ip == '::1'
    if not local_request:
        return HttpResponseNotFound()
    try:
        command_pid = int(pid)
    except ValueError:
        # provided pid parameter is not an integer
        return HttpResponseNotFound()
    MetricsMiddleware.disabled = False
    MetricsMiddleware.command_pid = command_pid
    return HttpResponse('ack', content_type='text/html')
