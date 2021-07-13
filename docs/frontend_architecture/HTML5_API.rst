HTML5 API
=========

In order to effectively and safely host embedded HTML5 apps as a first class content type in Kolibri, we use the standard IFrame Sandbox functionality and serve HTML5 apps from a separate origin. This allows for HTML5 apps to run arbitrary Javascript, without concerns about accessing privileged user data, as the separate origin will prevent leakage of the session authentication into the sandboxed context.


Standard Web APIs
-----------------

This shared origin does mean that every HTML5 app running in Kolibri is sharing the same origin - for standard Web APIs like cookies, local storage, and IndexedDB, this poses an issue, as it is possible that multiple HTML5 apps might overwrite each other's data.

To handle this eventuality, and to provide an enhanced user experience across multiple devices we shim these APIs in the context of the sandbox. Cookies and LocalStorage are persisted across the IFrame boundary, meaning that if a user interacts with an HTML5 app and it sets data to cookies and local storage, then if the user subsequently returns to the same HTML5 app, the cookies and local storage values from the previous session will be restored and available.

IndexedDB is also shimmed, but due to the very large amount of data that can be stored in IndexedDB, and the fact that it is often used for the local caching of file based assets (by the Unity framework, for example) this data is transmitted out of the IFrame sandbox. Instead the databases for IndexedDB are namespaced, in order to prevent clashes between IndexedDB storage from multiple HTML5 apps - however, this does mean that any data persisted to IndexedDB will only be preserved within the same browser only.

SCORM
-----

A large number of educational web content relies on the SCORM API to log data about learner interactions. In order to support this, Kolibri embeds a `SCORM` namespace on `window.parent` within the HTML5 app context. This is the standard place for SCORM API to be located, so any existing content that is SCORM compatible can be used without modification in this context. Currently, only SCORM 1.2 is supported by this interface, and there are no plans as yet to support the sequencing standard introduced by SCORM 2004. `More information about SCORM 1.2 and the API it exposes is available at the SCORM website <https://scorm.com/scorm-explained/technical-scorm/run-time/run-time-reference/#section-2>`__.

xAPI
----

A more general purpose, but not as widely used, standard for logging interactions about learning content is xAPI. In order to provide preliminary support for this standard, Kolibri exposes a `window.xAPI` object in the HTML5 app context. This API offers a set of methods that allow for using xAPI equivalent actions via a Promise based API. The methods available are loosely based on the `XAPIWrapper Javascript library API <https://github.com/adlnet/xAPIWrapper>`__, but limits its support to sending and querying statements, state, activity profiles, and agents. At the moment, the primary use case for this API is internal, it is used to log data from H5P content interactions.


Custom Navigation
-----------------

The purpose of the ``kolibri.js`` extension of our HTML5 API is to allow a sandboxed HTML5 app to safely request the main Kolibri application's data.

External/partner product teams can create HTML5 applications that are fully embeddable within Kolibri and can read Kolibri content data, which they otherwise wouldn't be able to access. This opens up possibilities for creative ways in which learners can engage with content, because partners can create any type of app they want. The app could be something completely new, developed for a content source that we are adding to the platform, or it could be a branded, offline recreation of a partner's existing learning app that previously would not have been able to exist on Kolibri.

When a user has permissions to access a custom channel, and they click on it in the main learn tab, rather than viewing `normal Kolibri`, they will experience a full-screen HTML5 app. One `out-of-the-box` user interaction is the ``navigateTo()`` function, which opens  a modal that displays a content node. For other data fetching requests, the app, not Kolibri, has the responsibilty of determining what to do with that data.


Basic API
~~~~~~~~~


Access the API from within an HTML5 app by using ``window.kolibri.[function]``

Functions:

.. code-block:: javascript

    /**
    * Type definition for Language metadata
    * @typedef {Object} Language
    * @property {string} id - an IETF language tag
    * @property {string} lang_code - the ISO 639‑1 language code
    * @property {string} lang_subcode - the regional identifier
    * @property {string} lang_name - the name of the language in that language
    * @property {('ltr'|'rtl'|)} lang_direction - Direction of the language's script,
    * top to bottom is not supported currently
    */

    /**
    * Type definition for ContentNode metadata
    * @typedef {Object} ContentNode
    * @property {string} id - unique id of the ContentNode
    * @property {string} channel_id - unique channel_id of the channel that the ContentNode is in
    * @property {string} content_id - identifier that is common across all instances of this resource
    * @property {string} title - A title that summarizes this ContentNode for the user
    * @property {string} description - detailed description of the ContentNode
    * @property {string} author - author of the ContentNode
    * @property {string} thumbnail_url - URL for the thumbnail for this ContentNode,
    * this may be any valid URL format including base64 encoded or blob URL
    * @property {boolean} available - Whether the ContentNode has all necessary files for rendering
    * @property {boolean} coach_content - Whether the ContentNode is intended only for coach users
    * @property {Language} lang - The primary language of the ContentNode
    * @property {string} license_description - The description of the license, which may be localized
    * @property {string} license_name - The human readable name of the license, localized
    * @property {string} license_owner - The name of the person or organization that holds copyright
    * @property {number} num_coach_contents - Number of coach contents that are descendants of this
    * @property {string} parent - The unique id of the parent of this ContentNode
    * @property {number} sort_order - The order of display for this node in its channel
    * if depth recursion was not deep enough
    */

    /**
    * Type definition for PageResults array
    * @property {ContentNode[]} results - the array of ContentNodes for this page
    * This will be updated to a Pagination Object once pagination is implemented
    */

    /**
    * Type definition for Theme options
    * properties TBD
    * @typedef {Object} Theme
    */

    /**
    * Type definition for NavigationContext
    * This can have arbitrary properties as defined
    * by the navigating app that it uses to resume its state
    * Should be able to be encoded down to <1600 characters using
    * an encoding function something like 'encode context' above
    * @typedef {Object} NavigationContext
    * @property {string} node_id - The current node_id that is being displayed,
    * custom apps should handle this as it may be used to
    * generate links externally to jump to this state
    */

    /*
    * Method to query contentnodes from Kolibri and return
    * an array of matching metadata
    * @param {Object} options - The different options to filter by
    * @param {string} [options.parent] - id of the parent node to filter by, or 'self'
    * @param {string} [options.ids] - an array of ids to filter by
    * @return {Promise<PageResult>} - a Promise that resolves to an array of ContentNodes
    */
    getContentByFilter(options)

    /*
    * Method to query a single contentnode from Kolibri and return
    * a metadata object
    * @param {string} id - id of the ContentNode
    * @return {Promise<ContentNode>} - a Promise that resolves to a ContentNode
    */
    getContentById(id)

    /*
    * Method to search for contentnodes on Kolibri and return
    * an array of matching metadata
    * @param {Object} options - The different options to search by
    * @param {string} [options.keyword] - search term for key word search
    * @param {string} [options.under] - id of topic to search under, or 'self'
    * @return {Promise<PageResult>} - a Promise that resolves to an array of ContentNodes
    */
    searchContent(options)

    /*
    * Method to set a default theme for any content rendering initiated by this app
    * @param {Theme} options - The different options for custom themeing
    * @param {string} [options.appBarColor] - Color for app bar atop the renderer
    * @param {string} [options.textColor] - Color for the text or icon
    * @param {string} [options.backdropColor] - Color for modal backdrop
    * @param {string} [options.backgroundColor] - Color for modal background
    * @return {Promise} - a Promise that resolves when the theme has been applied
    */
    themeRenderer(options)

    /*
    * Method to allow navigation to or rendering of a specific node
    * has optional parameter context that can update the URL for a custom context.
    * When this is called for a resource node in the custom navigation context
    * this will launch a renderer overlay to maintain the current state, and update the
    * query parameters for the URL of the custom context to indicate the change
    * If called for a topic in a custom context or outside of a custom context
    * this will simply prompt navigation to that node in Kolibri.
    * @param {string} nodeId - id of the parent node to navigate to
    * @param {NavigationContext=} context - optional context describing the state update
    * if node_id is missing from the context, it will be automatically filled in by this method
    * @return {Promise} - a Promise that resolves when the navigation has completed
    */
    navigateTo(nodeId, context)

    /*
    * Method to allow updating of stored state in the URL
    * @param {NavigationContext} context - context describing the state update
    * @return {Promise} - a Promise that resolves when the context has been updated
    */
    updateContext(context)

    /*
    * Method to request the current context state
    * @return {Promise<NavigationContext>} - a Promise that resolves
    * when the context has been updated
    */
    getContext()

    /*
    * Method to return the current version of Kolibri and hence the API available.
    * @return {Promise<string>} - A version string
    */
    getVersion()
