import re

from rest_framework.compat import get_original_route
from rest_framework.compat import URLPattern
from rest_framework.compat import URLResolver
from rest_framework.schemas.generators import endpoint_ordering
from rest_framework.schemas.generators import EndpointEnumerator
from rest_framework.schemas.generators import SchemaGenerator


class Enumerator(EndpointEnumerator):
    def get_api_endpoints(self, patterns=None, prefix='', namespace=""):  # noqa max-complexity=12
        """
        Return a list of all available API endpoints with basename by inspecting the URL conf.
        """
        if patterns is None:
            patterns = self.patterns

        find_endpoint = re.compile('([^\/\^\?\]\+\)\(\.]+)(?:(?=\/\([^\)]+\)\/\$)|(?=\/\$))')

        api_endpoints = []

        pattern_basenames = {}

        for pattern in patterns:

            path_regex = get_original_route(pattern)
            if isinstance(pattern, URLPattern):
                path = self.get_path_from_regex(path_regex)
                callback = pattern.callback
                if pattern.name:
                    if len(pattern.name.split('-')) > 1:
                        basename = pattern.name.split('-')[0]
                    else:
                        basename = pattern.name.split('_')[0]
                    basename = namespace + basename
                else:
                    basename = None
                sub = None
                if find_endpoint.search(pattern.describe()) and basename not in pattern_basenames:
                    sub = find_endpoint.search(pattern.describe()).groups()[0]
                    pattern_basenames[basename] = sub
                else:
                    sub = pattern_basenames.get(basename, None)
                if self.should_include_endpoint(path, callback):
                    for method in self.get_allowed_methods(callback):
                        if sub:
                            subtest = re.compile('^' + sub)
                            if basename and sub:
                                if not subtest.match(path) and sub in path:
                                    path = ('^' + path[path.index(sub):])
                                path = path.replace(sub, basename)
                        endpoint = (path, method, callback)
                        api_endpoints.append(endpoint)

            elif isinstance(pattern, URLResolver):
                inner_namespace = namespace + pattern.namespace + ":" if pattern.namespace else namespace
                nested_endpoints = self.get_api_endpoints(
                    patterns=pattern.url_patterns,
                    prefix=path_regex,
                    namespace=inner_namespace,
                )
                api_endpoints.extend(nested_endpoints)

        api_endpoints = sorted(api_endpoints, key=endpoint_ordering)

        return api_endpoints


class Generator(SchemaGenerator):
    endpoint_inspector_cls = Enumerator
