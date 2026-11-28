HTML5 API
=========

In order to effectively and safely host embedded HTML5 apps as a first class content type in Kolibri, we use the standard IFrame Sandbox functionality and serve HTML5 apps from a separate origin. This allows for HTML5 apps to run arbitrary Javascript, without concerns about accessing privileged user data, as the separate origin will prevent leakage of the session authentication into the sandboxed context.

This page covers the APIs available to HTML5 zip and IMSCP zip content. Other sandboxed content types are rendered by their own sandbox handlers (see ``SandboxedContentViewerHook`` in :doc:`single_page_apps`), and each handler installs only the shims its content needs - the standard Web APIs are common to all of them, everything else is not, including ``window.kolibri``, which ``Html5ZipHandler`` declares.


Standard Web APIs
-----------------

This shared origin does mean that every HTML5 app running in Kolibri is sharing the same origin - for standard Web APIs like cookies, local storage, and IndexedDB, this poses an issue, as it is possible that multiple HTML5 apps might overwrite each other's data.

To handle this eventuality, and to provide an enhanced user experience across multiple devices we shim these APIs in the context of the sandbox. Cookies and LocalStorage are persisted across the IFrame boundary, meaning that if a user interacts with an HTML5 app and it sets data to cookies and local storage, then if the user subsequently returns to the same HTML5 app, the cookies and local storage values from the previous session will be restored and available.

IndexedDB is also shimmed, but due to the very large amount of data that can be stored in IndexedDB, and the fact that it is often used for the local caching of file based assets (by the Unity framework, for example) this data is transmitted out of the IFrame sandbox. Instead the databases for IndexedDB are namespaced, in order to prevent clashes between IndexedDB storage from multiple HTML5 apps - however, this does mean that any data persisted to IndexedDB will only be preserved within the same browser only.

SCORM
-----

A large number of educational web content relies on the SCORM API to log data about learner interactions. In order to support this, Kolibri embeds an `API` object on the HTML5 app's own window and on `window.parent`. These are the standard places for the SCORM API to be located, so any existing content that is SCORM compatible can be used without modification in this context. Currently, only SCORM 1.2 is supported by this interface, and there are no plans as yet to support the sequencing standard introduced by SCORM 2004. `More information about SCORM 1.2 and the API it exposes is available at the SCORM website <https://scorm.com/scorm-explained/technical-scorm/run-time/run-time-reference/#section-2>`__.


Custom Navigation
-----------------

Use ``window.kolibri`` from an embedded HTML5 app. ``version`` is the host Kolibri version string. All methods return promises.

.. list-table:: Content queries
   :header-rows: 1

   * - Method on ``window.kolibri``
     - GET endpoint
   * - ``contentNode.list(params)``
     - ``/api/content/contentnode/``
   * - ``contentNode.retrieve(id, params)``
     - ``/api/content/contentnode/<id>/``
   * - ``contentNode.tree(id, params)``
     - ``/api/content/contentnode_tree/<id>/``

Pass endpoint query parameters as an optional plain object. Keys and responses are not renamed, and no channel filter is added. Use ``'self'`` as an ID or parameter value (for example, ``parent``, ``descendant_of`` or an item of ``ids``) to refer to the node running the app.

Set ``max_results`` (at most 100) to get a paginated ``{ more, results, labels }`` response. Pass ``more`` directly to ``list`` for the next page. Without ``max_results``, ``list`` returns an array.

.. code-block:: javascript

   const { contentNode } = window.kolibri;
   const page = await contentNode.list({ parent: 'self', max_results: 20 });
   if (page.more) {
     const nextPage = await contentNode.list(page.more);
   }

- ``navigateTo(nodeId)`` asks the host to open the node, rejecting with the endpoint's status if the node cannot be retrieved. The host must bind a navigation handler.
- ``requestData()`` returns the embedding host's data, or ``null`` if it supplies none.
- ``dependencyUrl(path)`` returns a URL for a file belonging to the calling node. It first matches ``<checksum>.<ext>`` against the node's files, returning a ``blob:`` URL of its contents, then looks for ``path`` inside its ``html5_dependency`` ZIP files.

A failed method rejects with an ``Error`` whose ``status`` indicates the failure:

.. list-table:: Error statuses
   :header-rows: 1

   * - Status
     - Meaning
   * - Endpoint status
     - The content endpoint rejected the request.
   * - ``400``
     - Invalid arguments or a request that could not be sent. IDs and paths must be strings.
   * - ``404``
     - No dependency matches the path.
   * - ``500``
     - The request failed before receiving an HTTP response, or the handler failed without a status.
   * - ``501``
     - No handler is bound for the call.
   * - ``502``
     - No dependency matches the path, and a dependency ZIP could not be listed.
   * - ``503``
     - The shim was destroyed with the request still pending.
   * - ``504``
     - No reply within 30 seconds.
