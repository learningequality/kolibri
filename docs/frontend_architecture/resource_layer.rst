Resource layer
==============

Frontend API calls go through a ``Resource``, which resolves the Django URL name and issues the request. Never call ``fetch``, ``axios`` or ``client`` from a component.

Adding an API call
------------------

1. Standard CRUD on a registered ``basename`` — `Reading and writing`_.
2. A DRF ``@action`` on that router — `Custom router actions`_.
3. A URL the router does not generate — `Endpoints that are not on the router`_.
4. Consuming it from a component — `Reactive composables`_.

Defining a resource
-------------------

.. code-block:: javascript
  :caption: packages/kolibri-common/apiResources/ClassroomResource.js

  import { Resource } from 'kolibri/apiResource';

  export default new Resource({
    name: 'classroom',
  });

``new Resource({ name, namespace = 'core', idKey = 'id' })``

``name``
  The ``basename`` the endpoint is registered under in ``api_urls.py``. Required.

``namespace``
  ``core``, or the plugin's full module path.

``idKey``
  The field holding an object's id. Set it when that field is not ``id`` — ``DevicePermissionsResource`` uses ``user``.

Any other property is attached to the resource instance; that is how the custom methods below are defined.

Core resources live in ``packages/kolibri-common/apiResources/``, plugin resources under the plugin's ``frontend/apiResources``.

.. seealso::
  :doc:`/howtos/working_with_urls_and_api_endpoints` for the URL naming rules.

Reading and writing
-------------------

Each method resolves with data, not with a response, and every method taking an ``id`` throws ``TypeError`` without one.

``retrieve(id, { params })``
  The object.

``list(params)``
  An array, or ``{ results, more, count }`` / ``{ results, page, total_pages, count }`` when the endpoint paginates.

``create(data, multipart = false)``
  The created object.

``update(id, data, { params, baseline })``
  The updated object. With a ``baseline`` snapshot only the differing fields are PATCHed; an unchanged object issues no request, resolving with a copy of the baseline.

``delete(id, { params })``
  The id.

``bulkCreate(data, multipart = false)``
  The created objects. Throws ``TypeError`` unless ``data`` is an array, and the endpoint must accept an array body.

``bulkDelete(params)``
  The response data. Throws ``TypeError`` without ``params``, so an unfiltered bulk delete is impossible.

Caching
-------

These methods do not read from a client-side cache. Concurrent identical GETs share one in-flight request, and no two callers share the resulting payload.

``ContentNodeResource`` is the exception: ``packages/kolibri-common/apiResources/ContentNodeResource.js`` overrides ``retrieve`` with a node cache, and a hit there ignores ``params``.

The request primitive
---------------------

``request({ method = 'GET', action = 'list', routeParams, params, data, multipart })`` resolves with the whole response, so callers read ``.data``. Every `Reading and writing`_ method is built on it.

- ``action`` selects the URL registered as ``kolibri:<namespace>:<name>_<action>``. A missing URL raises ``ReferenceError``.
- ``routeParams`` fills the URL's own parameters: an object is passed as kwargs, an array is spread, any other value is a single positional argument. A ``detail=True`` action takes the pk this way; a ``detail=False`` action takes none.

Custom router actions
---------------------

A DRF ``@action`` gets its own named method on the resource, which call sites use instead of ``request``.

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

Endpoints that are not on the router
------------------------------------

A bare ``APIView`` URL has no ``<name>_<action>`` name for ``request`` to resolve, so it still needs ``client()`` and ``urls[...]`` — inside a resource method, never in a component.

.. code-block:: javascript
  :caption: packages/kolibri-common/apiResources/FacilityUserResource.js

  import { Resource } from 'kolibri/apiResource';
  import urls from 'kolibri/urls';
  import client from 'kolibri/client';

  export default new Resource({
    name: 'facilityuser',
    removeImportedUser(user_id) {
      return client({
        url: urls['kolibri:core:deleteimporteduser'](user_id),
        method: 'DELETE',
      });
    },
  });

With no ViewSet at all there is no resource to hang the method on, so the same ``client()`` call goes in a plain module exporting that one function — ``packages/kolibri-common/utils/checkMeteredConnection.js``.

Reactive composables
--------------------

These are methods on the resource — ``FacilityUserResource.useRetrieve(userId)`` — each wrapping a `Reading and writing`_ method in refs for ``setup()``. ``useRetrieve`` and ``useList`` fetch only when ``fetchData()`` is called.

``useRetrieve(id, { params, onSuccess })``
  ``{ data, loading, error, fetchData }``. Live: ``kolibri/plugins/user_profile/frontend/composables/useCurrentUser.js``.

``useList(params, { onSuccess })``
  ``useFetch``'s ``FetchObject``: ``{ data, loading, loadingMore, error, count, page, totalPages, hasMore, fetchData, fetchMore }``. Live: ``kolibri/plugins/facility/frontend/composables/useUserManagement.js``.

``useUpdate(id, data, { params, multipart })``
  ``{ isSaving, error, isDirty, setBaseline, create, update, save }``, bound to one object: ``create()`` when ``id`` is empty, ``update()`` otherwise, and ``save()`` dispatches between them. Live: ``kolibri/plugins/coach/frontend/composables/useQuizCreation.js``.

Traps:

- ``id``, ``params`` and ``data`` each take a value, a ref or a getter, read at fetch or call time and **not** watched — a change needs another ``fetchData()`` or ``save()``.
- A ``more`` cursor appends through ``fetchMore``/``hasMore``; a page-number endpoint needs ``params`` updated and ``fetchData()`` re-called, reading ``page``/``totalPages``.
- Pairing ``useRetrieve`` with ``useUpdate`` means seeding the working data **and** calling ``setBaseline`` in the same ``onSuccess``, or ``isDirty`` reads true before any edit.

For a custom resource method, wrap it in ``useFetch`` (``packages/kolibri/composables/useFetch.js``), as ``kolibri/plugins/coach/frontend/composables/useResourceSelection.js`` does for ``ContentNodeResource.fetchBookmarks``.

.. seealso::
  :doc:`composables` for the naming, file-placement and testing conventions every composable follows.
