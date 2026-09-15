Resource layer
==============

Frontend API calls go through a ``Resource``, which resolves the Django URL name and issues the request. Never call ``fetch``, ``axios`` or ``client`` from a component.

.. seealso::
  :doc:`/dataflow/index` for the stack around this layer — the Django model, ViewSet and serializer that produce the JSON on the other side of the request.

  :doc:`/howtos/working_with_urls_and_api_endpoints` for the layer underneath — how a ``basename`` becomes the URL name resolved here, and how to debug one that does not resolve.

Defining a resource
-------------------

.. code-block:: javascript
  :caption: packages/kolibri-common/apiResources/ClassroomResource.js

  import { Resource } from 'kolibri/apiResource';

  export default new Resource({
    name: 'classroom'
  });

The Resource constructor only takes one argument, an object with properties that define the resource. This object can have the following properties:

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Property
     - Description
   * - ``name``
     - The ``basename`` the endpoint is registered under in ``api_urls.py``. Required.
   * - ``namespace``
     - ``core``, The plugin's full module path (e.g., ``kolibri.plugins.coach``). Defaults to ``core`` for core resources.
   * - ``idKey``
     - The field holding an object's id (e.g., ``id``, ``pk``, ``user_id``). Defaults to ``id``.

The object is not limited to these options. Any other property you add to it, whether a method, a getter or a plain value, is copied onto the resource instance. Inside a method, ``this`` is the resource, so the method can call ``this.request()`` or the built-in methods below. This is how resources define `Custom router actions`_. A property with the same name as a built-in method replaces it, which is how ``ContentNodeResource`` overrides ``retrieve``.

Core resources live in ``packages/kolibri-common/apiResources/``, plugin resources under the plugin's ``frontend/apiResources/``.

.. seealso::
  :doc:`/howtos/working_with_urls_and_api_endpoints` for what to pass as ``name`` and ``namespace``, including the underscores-not-dashes rule that makes a lookup fail.

Reading and writing
-------------------

Each built-in method sends one request to one of the resource's two endpoints: the list endpoint, which covers the whole collection, or the detail endpoint, which covers the single object identified by ``id``. These are the ``list`` and ``detail`` actions of `The request primitive`_. The ViewSet handles each request with the matching action:

.. list-table::
   :header-rows: 1
   :widths: 40 30 30

   * - Method
     - Request
     - ViewSet action
   * - ``list(params)``
     - ``GET`` list endpoint
     - ``list``
   * - ``retrieve(id, { params })``
     - ``GET`` detail endpoint
     - ``retrieve``
   * - ``create(data, multipart = false)``
     - ``POST`` list endpoint
     - ``create``
   * - ``update(id, data, { params, baseline })``
     - ``PATCH`` detail endpoint
     - ``partial_update``
   * - ``delete(id, { params })``
     - ``DELETE`` detail endpoint
     - ``destroy``
   * - ``bulkCreate(data, multipart = false)``
     - ``POST`` list endpoint
     - ``create``
   * - ``bulkDelete(params)``
     - ``DELETE`` list endpoint
     - ``bulk_destroy``

Every method resolves with the response data, not the response object. Every method that takes an ``id`` throws ``TypeError`` without one. A method only works if the ViewSet implements its action. For example, a read-only endpoint rejects ``create()`` with ``405 Method Not Allowed``.

Query params
~~~~~~~~~~~~

``params`` is a plain object sent as the query string. Array values are joined with commas, so ``{ ids: [a, b] }`` becomes ``?ids=a,b``. The ViewSet uses these params in two ways:

- **As filters.** Keys declared on the ViewSet's ``filterset_class`` narrow the queryset. For example, ``FacilityUserResource.list({ member_of: classId })`` uses the ``member_of`` filter on ``FacilityUserFilter`` in ``kolibri/core/auth/viewsets/facility_user.py``. The filter backend ignores keys the filterset does not declare, so a misspelled filter returns unfiltered results instead of an error.
- **As other query params** that the ViewSet reads from ``request.query_params`` itself, such as the pagination params described under `list`_, or ``baseurl`` in ``ContentNodeResource.retrieve(id, { params: { baseurl } })`` to read from a remote Kolibri instance.

Filters also apply on the detail endpoints. ``retrieve``, ``update`` and ``delete`` look up the object inside the filtered queryset, so if the ``params`` exclude that object, the request fails with ``404``.

list
~~~~

``list(params)`` sends ``GET`` to the list endpoint, with ``params`` as filters and pagination params.

It resolves with an array, unless the ViewSet's ``pagination_class`` paginates the response. Most pagination in Kolibri is opt-in, so the same endpoint returns an array until a pagination param is passed. The params and the response shape depend on the ViewSet's pagination style:

.. list-table::
   :header-rows: 1
   :widths: 30 30 40

   * - Pagination style
     - Params
     - Resolves with
   * - Page number
     - ``page_size``, ``page``
     - ``{ results, page, total_pages, count }``
   * - Limit and offset
     - ``limit``, ``offset``
     - ``{ results, more, count }``
   * - Cursor
     - Set by the ViewSet, for example ``max_results`` on the content node endpoints
     - ``{ results, more }``

``more`` is ``null`` on the last page. Otherwise it is the complete ``params`` object for the next page, including your filters, so passing it back to ``list(more)`` fetches that page.

retrieve
~~~~~~~~

``retrieve(id, { params })`` sends ``GET`` to the detail endpoint and resolves with the object. ``params`` go in the query string as described in `Query params`_.

create and bulkCreate
~~~~~~~~~~~~~~~~~~~~~

``create(data, multipart = false)`` sends ``POST`` to the list endpoint with ``data`` as the body and resolves with the created object. Pass ``multipart = true`` to encode the body as ``multipart/form-data``, for example to upload a file.

``bulkCreate(data, multipart = false)`` sends an array of objects in one ``POST`` and resolves with the created objects. It throws ``TypeError`` unless ``data`` is an array, and the ViewSet must accept an array body, which ``BulkCreateMixin`` provides.

Neither method takes ``params``.

update
~~~~~~

``update(id, data, { params, baseline })`` sends ``PATCH`` to the detail endpoint and resolves with the updated object. Because the request is a ``PATCH``, ``data`` only needs the fields being changed.

With a ``baseline`` snapshot (the object as last read from the server), only the fields of ``data`` that differ from it are sent. If nothing differs, no request is issued, and the method resolves with a copy of ``baseline``.

delete and bulkDelete
~~~~~~~~~~~~~~~~~~~~~

``delete(id, { params })`` sends ``DELETE`` to the detail endpoint and resolves with ``id``.

``bulkDelete(params)`` sends ``DELETE`` to the list endpoint and deletes every object matching ``params``, such as ``MembershipResource.bulkDelete({ user: userId, collection: classId })``. It throws ``TypeError`` when ``params`` is empty. The backend also rejects the request with ``400`` unless at least one param is a declared filter, so an unfiltered bulk delete is impossible. The ViewSet needs ``BulkDeleteMixin``, and it must be registered on a ``BulkDeleteRouter``, which routes ``DELETE`` on the list endpoint to ``bulk_destroy``.

Caching
-------

The resource layer keeps no client-side cache of its own. Caching relies only on the ``ETag`` headers the backend sends. The browser stores those responses and revalidates them with ``If-None-Match``, and when the server answers ``304 Not Modified``, the method resolves with the browser's stored copy. No code is needed on the frontend.

Concurrent identical GETs share one in-flight request. This means, if multiple calls are made to retrieve the same resource concurrently, only one request is sent to the server. This is not a cache: the entry is dropped as soon as the request settles, and each caller gets its own copy of the payload.

``ContentNodeResource`` is the one exception. It implements its own simple in-memory cache for its reading methods, in ``packages/kolibri-common/apiResources/ContentNodeResource.js``. Every content node its reading methods return (``list``, ``retrieve``, ``fetchTree`` and ``fetchBookmarks``, including nested ``children``) is stored by id. A later ``retrieve`` for a stored id resolves with a copy from that cache, without a request. The cache is never cleared while the page is open.

The request primitive
---------------------

The built-in methods only cover the standard list and detail requests. An endpoint often needs more than that: a custom ``@action``, an HTTP method the built-ins don't send for that endpoint, or direct access to the response. For these cases, every resource has ``request``, the single low-level method that resolves the URL and sends the request.

``request`` is not an extra path alongside the built-in methods. Every `Reading and writing`_ method calls it in the background. So a call through ``request`` gets the same URL resolution, error logging and sharing of identical in-flight GETs described in `Caching`_.

Inside a resource definition, reference it as ``this.request()``, since ``this`` is the resource (see `Defining a resource`_):

.. code-block:: javascript

  const response = await this.request({ action: 'detail', routeParams: id, params });

Unlike the built-in methods, ``request`` resolves with the whole response rather than the data, so callers read ``response.data``, or ``response.status`` and headers when they need them.

``request`` takes one options object, and every property is optional:

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Property
     - Description
   * - ``method``
     - The HTTP method to send, such as ``'GET'``, ``'POST'``, ``'PATCH'`` or ``'DELETE'``. Defaults to ``'GET'``.
   * - ``action``
     - The endpoint to target. It resolves to the URL named ``kolibri:<namespace>:<name>_<action>``: ``'list'`` and ``'detail'`` for the standard endpoints, or the name of a custom ``@action``. Defaults to ``'list'``. A name with no matching URL throws ``ReferenceError``. :doc:`/howtos/working_with_urls_and_api_endpoints` lists the usual causes.
   * - ``routeParams``
     - Values for the parameters inside the URL path itself, such as the id on a detail endpoint. Takes a single value, an array or an object, as described in `Route params`_. Omit it for endpoints with no URL parameters.
   * - ``params``
     - The query string, used as described in `Query params`_.
   * - ``data``
     - The request body for writes. Ignored for ``GET``.
   * - ``multipart``
     - When ``true``, sends ``data`` as ``multipart/form-data`` instead of JSON, for example to upload a file. Defaults to ``false``.

Components should not call ``request`` directly. Wrap it in a named method on the resource, as shown in `Custom router actions`_, so that each endpoint is defined in one place and call sites read like the built-in methods.

Route params
~~~~~~~~~~~~

``routeParams`` fills the parameters in the URL path, the named groups in the Django route definition such as ``(?P<pk>[^/.]+)`` or ``<pk>``. They are separate from ``params``, which only builds the query string. Each value is URL-encoded. ``routeParams`` accepts three forms:

- **A single value**, when the route has one parameter. This is the common case: the id on a detail endpoint or on a ``detail=True`` action.

  .. code-block:: javascript

    // /api/.../<pk>/
    this.request({ action: 'detail', routeParams: id });

- **An array**, when the route has several parameters. The values are matched by position, in the order the parameters appear in the route.

  .. code-block:: javascript

    // /api/.../session/<session_id>/unit/<unit_id>/
    this.request({ action: 'report', routeParams: [sessionId, unitId] });

- **An object**, whose keys match the parameter names in the Django route definition. Order does not matter, which makes it the clearer choice for routes with several parameters.

  .. code-block:: javascript

    // /api/.../session/<session_id>/unit/<unit_id>/
    this.request({ action: 'report', routeParams: { session_id: sessionId, unit_id: unitId } });

If no route matches the values given, because an array has the wrong number of values or an object is missing a key, resolving the URL throws an error instead of sending the request.

Custom router actions
---------------------

A DRF ``@action`` on the ViewSet is not covered by the built-in methods. Give it its own named method on the resource, built on ``this.request()``, and use that method at call sites.

Pass the action's URL name as ``action``. For example, ``@action(detail=True) def tree(...)`` on the content node progress ViewSet, which only has only the id as route parameter, becomes:

.. code-block:: javascript
  :caption: packages/kolibri-common/apiResources/ContentNodeProgressResource.js

  import { Resource } from 'kolibri/apiResource';

  export default new Resource({
    name: 'contentnodeprogress',
    async fetchTree({ id, params }) {
      const { data } = await this.request({ action: 'tree', routeParams: id, params });
      return data;
    },
  });

A component then calls ``ContentNodeProgressResource.fetchTree({ id, params })``, which reads like any built-in method and resolves with data.

Reactive composables
--------------------

The `Reading and writing`_ methods return promises, which leaves every component to track loading and error state by hand. For use inside ``setup()``, every resource also has three composables that wrap those methods in refs. Call them on the resource like any other method:

.. code-block:: javascript

  const { data, loading, error, fetchData } = FacilityUserResource.useRetrieve(userId);

.. list-table::
   :header-rows: 1
   :widths: 40 20 40

   * - Composable
     - Wraps
     - Returns
   * - ``useRetrieve(id, { params, onSuccess })``
     - ``retrieve``
     - ``{ data, loading, error, fetchData }``
   * - ``useList(params, { onSuccess })``
     - ``list``
     - ``{ data, loading, loadingMore, error, count, page, totalPages, hasMore, fetchData, fetchMore }``
   * - ``useUpdate(id, data, { params, multipart })``
     - ``create`` and ``update``
     - ``{ isSaving, error, isDirty, setBaseline, create, update, save }``

Their arguments are not watched. ``id``, ``params`` and ``data`` each accept a plain value, a ref or a getter, and the composable reads the current value each time it sends a request. Changing one does not trigger a request by itself: call ``fetchData()`` or ``save()`` again.

useRetrieve
~~~~~~~~~~~

``useRetrieve(id, { params, onSuccess })`` reads one object. Nothing is fetched until you call ``fetchData()``, which calls ``retrieve`` and stores the object in ``data``.

``fetchData()`` never rejects. A failed request sets ``error`` instead, and ``error`` is cleared at the start of the next fetch. If ``fetchData()`` is called again before the previous request settles, only the latest response is kept.

``onSuccess`` is called with the object after each successful fetch. For an example in use, see ``kolibri/plugins/user_profile/frontend/composables/useCurrentUser.js``.

useList
~~~~~~~

``useList(params, { onSuccess })`` reads a collection. Like ``useRetrieve``, it fetches only when ``fetchData()`` is called, stores errors in ``error``, and keeps only the latest response.

``data`` always holds the items. For a paginated response, it holds ``results``, and the rest of the response fills the other refs. How you move between pages depends on the pagination style described under `list`_:

- **Limit and offset, or cursor.** The response includes ``more``. ``hasMore`` is ``true`` while there is a next page, and ``fetchMore()`` fetches it and appends its items to ``data``, which suits load more scenarios. ``loadingMore`` tracks that request separately from ``loading``.
- **Page number.** ``page`` and ``totalPages`` describe the current page, and ``hasMore`` stays ``false``. To change page, update the page in ``params`` and call ``fetchData()`` again.

``onSuccess`` is called with the raw response after each ``fetchData()``, but not after ``fetchMore()``. For an example in use, see ``kolibri/plugins/facility/frontend/composables/useUserManagement.js``.

useUpdate
~~~~~~~~~

``useUpdate(id, data, { params, multipart })`` saves one object. ``data`` is the working copy a form edits. ``create()``, ``update()`` and ``save()`` take no arguments and read the current ``id`` and ``data``:

- ``create()`` sends ``data`` with ``create``. It rejects if ``id`` is already set. After it resolves, set ``id`` to the new object's id to keep editing it.
- ``update()`` sends ``data`` with ``update``. It rejects if ``id`` is empty.
- ``save()`` calls ``create()`` when ``id`` is empty and ``update()`` otherwise, so call sites don't need to branch.

Unlike the read composables, a failed save both sets ``error`` and rejects. ``isSaving`` is ``true`` while a save is in flight.

``useUpdate`` keeps a baseline, the last known server copy of the object. ``update()`` passes it to ``update`` as ``baseline``, so only changed fields are sent. ``isDirty`` is ``true`` when ``data`` differs from the baseline. Every successful save records the saved object as the new baseline. To set it after loading the object, call ``setBaseline``. When ``data`` is loaded with ``useRetrieve``, seed ``data`` and the baseline in the same ``onSuccess``. Otherwise ``isDirty`` reads ``true`` before any edit:

.. code-block:: javascript

  const { data: exam, fetchData } = ExamResource.useRetrieve(examId, {
    onSuccess: data => {
      setBaseline(data);
    },
  });

  const { isSaving, isDirty, setBaseline, save } = ExamResource.useUpdate(examId, exam);
  fetchData();

``isDirty`` compares the whole object, so ``data`` must have the same fields as the server object. A ``data`` holding only some of the fields always reads as dirty. For an example in use, see ``kolibri/plugins/coach/frontend/composables/useQuizCreation.js``.

Custom methods
~~~~~~~~~~~~~~

The composables only wrap the ``retrieve``, ``list``, ``create`` and ``update`` built-in methods. For a custom resource method, such as one from `Custom router actions`_, wrap it in ``useFetch`` from ``packages/kolibri/composables/useFetch.js``. That is the composable ``useRetrieve`` and ``useList`` are built on, so it returns the same refs. ``kolibri/plugins/coach/frontend/composables/useResourceSelection.js`` does this for ``ContentNodeResource.fetchBookmarks``.

.. seealso::
  :doc:`composables` for the naming, file-placement and testing conventions every composable follows.
