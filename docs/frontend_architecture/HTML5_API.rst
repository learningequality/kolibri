Custom Navigation
=================

The purpose of the ``kolibri.js`` extension of our HTML5 API is to allow a sandboxed HTML5 app to safely request the main Kolibri application's data.

External/partner product teams can create HTML5 applications that are fully embeddable within Kolibri and can read Kolibri content data, which they otherwise wouldn't be able to access. This opens up possibilities for creative ways in which learners can engage with content, because partners can create any type of app they want. The app could be something completely new, developed for a content source that we are adding to the platform, or it could be a branded, offline recreation of a partner's existing learning app that previously would not have been able to exist on Kolibri.

When a user has permissions to access a custom channel, and they click on it in the main learn tab, rather than viewing "normal Kolibri," they will experience a full-screen HTML5 app. One "out-of-the-box" user interaction is the "navigateTo()" function, which opens  a modal that displays a content node. For other data fetching requests, the app, not Kolibri, has the responsibilty of determining what to do with that data.


Basic API
~~~~~~~~~


Access the API from within an HTML5 app by using ``window.kolibri.[function]``

Functions:

.. code-block:: javascript

    /*
    * Method to query contentnodes from Kolibri and return
    * an array of matching metadata
    * @param {Object} options - The different options to filter by
    * @param {string=} options.parent - id of the parent node to filter by, or 'self'
    * @param {string[]} options.ids - an array of ids to filter by
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
    * @param {string=} options.keyword - search term for key word search
    * @param {string=} options.under - id of topic to search under, or 'self'
    * @return {Promise<PageResult>} - a Promise that resolves to an array of ContentNodes
    */
    searchContent(options)

    /*
    * Method to set a default theme for any content rendering initiated by this app
    * @param {Theme} options - The different options for custom themeing
    * @param {string} options.appBarColor - Color for app bar atop the renderer
    * @param {string} options.textColor - Color for the text or icon
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
