import hashlib
from base64 import b64encode
from collections import OrderedDict

from django.core.cache import cache
from django.core.exceptions import EmptyResultSet
from django.core.paginator import InvalidPage
from django.core.paginator import Page
from django.core.paginator import Paginator
from django.db.models import QuerySet
from django.utils.functional import cached_property
from rest_framework.pagination import _reverse_ordering
from rest_framework.pagination import CursorPagination
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.pagination import NotFound
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from six.moves.urllib.parse import urlencode


class ValuesPage(Page):
    def __init__(self, object_list, number, paginator):
        self.queryset = object_list
        self.object_list = object_list
        self.number = number
        self.paginator = paginator


class ValuesViewsetPaginator(Paginator):
    def __init__(self, object_list, *args, **kwargs):
        if not isinstance(object_list, QuerySet):
            raise TypeError(
                "ValuesViewsetPaginator is only intended for use with Querysets"
            )
        self.queryset = object_list
        object_list = object_list.values_list("pk", flat=True).distinct()
        super(ValuesViewsetPaginator, self).__init__(object_list, *args, **kwargs)

    def _get_page(self, object_list, *args, **kwargs):
        pks = list(object_list)
        return ValuesPage(self.queryset.filter(pk__in=pks), *args, **kwargs)


class CachedValuesViewsetPaginator(ValuesViewsetPaginator):
    @cached_property
    def count(self):
        """
        The count is implemented with this 'double cache' so as to cache the empty results
        as well. Because the cache key is dependent on the query string, and that cannot be
        generated in the instance that the query_string produces an EmptyResultSet exception.
        """
        try:
            query_string = str(self.object_list.query).encode("utf8")
            cache_key = "query-count:" + hashlib.md5(query_string).hexdigest()
            value = cache.get(cache_key)
            if value is None:
                value = super(CachedValuesViewsetPaginator, self).count
                cache.set(cache_key, value, 300)  # save the count for 5 minutes
        except EmptyResultSet:
            # If the query is an empty result set, then this error will be raised by
            # Django - this happens, for example when doing a pk__in=[] query
            # In this case, we know the value is just 0!
            value = 0
        return value


class ValuesViewsetPageNumberPagination(PageNumberPagination):
    django_paginator_class = ValuesViewsetPaginator

    def paginate_queryset(self, queryset, request, view=None):
        """
        Paginate a queryset if required, either returning a
        the queryset of a page object so that it can be further annotated for serialization,
        or `None` if pagination is not configured for this view.
        This is vendored and modified from:
        https://github.com/encode/django-rest-framework/blob/master/rest_framework/pagination.py#L191
        """
        page_size = self.get_page_size(request)
        if not page_size:
            return None

        paginator = self.django_paginator_class(queryset, page_size)
        page_number = request.query_params.get(self.page_query_param, 1)

        try:
            self.page = paginator.page(page_number)
        except InvalidPage as exc:
            msg = self.invalid_page_message.format(
                page_number=page_number, message=str(exc)
            )
            raise NotFound(msg)

        if paginator.num_pages > 1 and self.template is not None:
            # The browsable API should display pagination controls.
            self.display_page_controls = True

        self.request = request
        # This is the only difference between the original function and this implementation
        # here, instead of returning the page coerced to a list, we explicitly return the queryset
        # of the page, so that we can do further annotations on it - otherwise, once it is coerced
        # to a list, the DB read has already occurred.
        return self.page.queryset

    def get_paginated_response(self, data):
        return Response(
            {
                "page": self.page.number,
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "results": data,
            }
        )

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "properties": {
                "count": {
                    "type": "integer",
                    "example": 123,
                },
                "results": schema,
                "page": {
                    "type": "integer",
                    "example": 123,
                },
                "total_pages": {
                    "type": "integer",
                    "example": 123,
                },
            },
        }


class CachedListPagination(ValuesViewsetPageNumberPagination):
    django_paginator_class = CachedValuesViewsetPaginator


class ValuesViewsetLimitOffsetPagination(LimitOffsetPagination):
    def paginate_queryset(self, queryset, request, view=None):
        """
        Paginate a queryset if required, either returning a
        the queryset of a page object so that it can be further annotated for serialization,
        or `None` if pagination is not configured for this view.
        This is vendored and modified from:
        https://github.com/encode/django-rest-framework/blob/master/rest_framework/pagination.py#L382
        """
        self.limit = self.get_limit(request)
        if self.limit is None:
            return None

        self.count = self.get_count(queryset)
        self.offset = self.get_offset(request)
        self.request = request
        if self.count > self.limit and self.template is not None:
            self.display_page_controls = True

        if self.count == 0 or self.offset > self.count:
            return queryset.none()
        # Ensure we evaluate the sliced queryset and do an explicit filter by the subsequent PKs
        # to avoid issues when we later try to annotate this queryset.
        return queryset.filter(
            pk__in=list(
                queryset.values_list("pk", flat=True).distinct()[
                    self.offset : self.offset + self.limit
                ]
            )
        )

    def get_more(self):
        if self.offset + self.limit >= self.count:
            return None

        params = self.request.query_params.copy()
        params.update(
            {
                "limit": self.limit,
                "offset": self.offset + self.limit,
            }
        )
        return params

    def get_paginated_response(self, data):
        return Response(
            OrderedDict(
                [("count", self.count), ("more", self.get_more()), ("results", data)]
            )
        )

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "properties": {
                "count": {
                    "type": "integer",
                    "example": 123,
                },
                "more": {
                    "type": "object",
                    "nullable": True,
                    "example": {
                        "limit": 25,
                        "offset": 25,
                    },
                },
                "results": schema,
            },
        }


class ValuesViewsetCursorPagination(CursorPagination):
    def paginate_queryset(self, queryset, request, view=None):
        pks_queryset = super(ValuesViewsetCursorPagination, self).paginate_queryset(
            queryset, request, view=view
        )
        if pks_queryset is None:
            return None
        self.request = request
        if self.cursor is None:
            reverse = False
        else:
            _, reverse, _ = self.cursor
        ordering = _reverse_ordering(self.ordering) if reverse else self.ordering
        return queryset.filter(pk__in=[obj.pk for obj in pks_queryset]).order_by(
            *ordering
        )

    def get_more(self):  # noqa C901
        """
        Vendored and modified from
        https://github.com/encode/django-rest-framework/blob/6ea95b6ad1bc0d4a4234a267b1ba32701878c6bb/rest_framework/pagination.py#L694
        """
        if not self.has_next:
            return None

        if (
            self.page
            and self.cursor
            and self.cursor.reverse
            and self.cursor.offset != 0
        ):
            # If we're reversing direction and we have an offset cursor
            # then we cannot use the first position we find as a marker.
            compare = self._get_position_from_instance(self.page[-1], self.ordering)
        else:
            compare = self.next_position
        offset = 0

        has_item_with_unique_position = False
        for item in reversed(self.page):
            position = self._get_position_from_instance(item, self.ordering)
            if position != compare:
                # The item in this position and the item following it
                # have different positions. We can use this position as
                # our marker.
                has_item_with_unique_position = True
                break

            # The item in this position has the same position as the item
            # following it, we can't use it as a marker position, so increment
            # the offset and keep seeking to the previous item.
            compare = position
            offset += 1

        if self.page and not has_item_with_unique_position:
            # There were no unique positions in the page.
            if not self.has_previous:
                # We are on the first page.
                # Our cursor will have an offset equal to the page size,
                # but no position to filter against yet.
                offset = self.page_size
                position = None
            elif self.cursor.reverse:
                # The change in direction will introduce a paging artifact,
                # where we end up skipping forward a few extra items.
                offset = 0
                position = self.previous_position
            else:
                # Use the position from the existing cursor and increment
                # it's offset by the page size.
                offset = self.cursor.offset + self.page_size
                position = self.previous_position

        if not self.page:
            position = self.next_position

        tokens = {}
        if offset != 0:
            tokens["o"] = str(offset)
        if position is not None:
            tokens["p"] = position

        querystring = urlencode(tokens, doseq=True)
        encoded = b64encode(querystring.encode("ascii")).decode("ascii")
        params = self.request.query_params.copy()
        params.update(
            {
                self.cursor_query_param: encoded,
            }
        )
        return params

    def get_paginated_response(self, data):
        return Response(OrderedDict([("more", self.get_more()), ("results", data)]))

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "properties": {
                "more": {
                    "type": "object",
                    "nullable": True,
                    "example": {
                        "cursor": "asdadshjashjadh",
                    },
                },
                "results": schema,
            },
        }
