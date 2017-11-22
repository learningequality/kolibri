API endpoints
-------------

request specific content:

    >>> localhost:8000/api/content/<channel_id>/contentnode/<content_id>

search content:

    >>> localhost:8000/api/content/<channel_id>/contentnode/?search=<search words>

request specific content with specified fields:

    >>> localhost:8000/api/content/<channel_id>/contentnode/<content_id>/?fields=pk,title,kind

request paginated contents

    >>> localhost:8000/api/content/<channel_id>/contentnode/?page=6&page_size=10

request combines different usages

    >>> localhost:8000/api/content/<channel_id>/contentnode/?fields=pk,title,kind,instance_id,description,files&page=6&page_size=10&search=wh