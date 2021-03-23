/**
 * This class offers an API interface for interacting directly with the Kolibri app
 * that the HTML5 app is embedded within
 */
import BaseShim from './baseShim';
// import KolibriData from './kolibriData';

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
 * Type definition for pagination object
 * @typedef {Object} PageResult
 * @property {number} page - the page that this pagination object represents
 * @property {number} pageSize - the page size for this pagination object
 * @property {ContentNode[]} results - the array of ContentNodes for this page
 */

/**
 * Type definition for Theme options
 * properties TBD
 * @typedef {Object} Theme
 */

// function encodeContext(context) {
//   return encodeURI(Object.entries(context).map(([k, v]) => `${k}:${v}`));
// }

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

export default class Kolibri extends BaseShim {
  constructor(mediator) {
    super(mediator);
    this.data = {};
    this.nameSpace = 'kolibri';
    // this.__setData = this.__setData.bind(this);
    // this.on(this.events.STATEUPDATE, this.__setData);
  }

  iframeInitialize(contentWindow) {
    this.__setShimInterface();
    Object.defineProperty(contentWindow, this.nameSpace, {
      value: this.shim,
      writable: true,
    });
    console.log(contentWindow.kolibri.getContentByFilter());
  }

  __setShimInterface() {
    // const self = this;

    var lang = {
      id: 'en-gb',
      lang_code: 'en',
      lang_subcode: 'gb',
      lang_name: 'Proper English innit?',
      lang_direction: 'ltr',
    };

    class Shim {
      /*
       * Method to query contentnodes from Kolibri and return
       * an array of matching metadata
       * @param {Object} options - The different options to filter by
       * @param {string=} options.parent - id of the parent node to filter by, or 'self'
       * @param {string[]} options.ids - an array of ids to filter by
       * @param {number} [options.page=1] - which page to return from the result set
       * @param {number} [options.pageSize=50] - the page size for pagination
       * @return {Promise<PageResult>} - a Promise that resolves to an array of ContentNodes
       */
      getContentByFilter() {
        return Promise.resolve({
          page: 1,
          pageSize: 50,
          results: [
            {
              id: '3fe4c0d834c54646889854bfc2d41c30',
              channel_id: 'a1a62374546e47509b6979a9322e7598',
              content_id: 'cc5c6829685d439385920f39db9bed65',
              title: 'Test Node 1',
              description: 'Just a test',
              author: 'Me',
              thumbnail_url:
                'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+CjwhLS0gR2VuZXJhdGVkIGJ5IFNWR28gLS0+Cjxzdmcgd2lkdGg9IjIyMCIgaGVpZ2h0PSIyMjAiCiAgICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICAgIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj4KPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoMjI2LDI1NSwyMjIpIiAvPgo8cmVjdCB4PSIzNiIgeT0iMCIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoOTMsMjE0LDc1KSIgLz4KPHJlY3QgeD0iNzIiIHk9IjAiIHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiIgc3R5bGU9ImZpbGw6cmdiKDkzLDIxNCw3NSkiIC8+CjxyZWN0IHg9IjEwOCIgeT0iMCIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoOTMsMjE0LDc1KSIgLz4KPHJlY3QgeD0iMTQ0IiB5PSIwIiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHN0eWxlPSJmaWxsOnJnYig5MywyMTQsNzUpIiAvPgo8cmVjdCB4PSIxODAiIHk9IjAiIHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiIgc3R5bGU9ImZpbGw6cmdiKDIyNiwyNTUsMjIyKSIgLz4KPHJlY3QgeD0iMCIgeT0iMzYiIHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiIgc3R5bGU9ImZpbGw6cmdiKDkzLDIxNCw3NSkiIC8+CjxyZWN0IHg9IjM2IiB5PSIzNiIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoOTMsMjE0LDc1KSIgLz4KPHJlY3QgeD0iNzIiIHk9IjM2IiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHN0eWxlPSJmaWxsOnJnYig5MywyMTQsNzUpIiAvPgo8cmVjdCB4PSIxMDgiIHk9IjM2IiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHN0eWxlPSJmaWxsOnJnYig5MywyMTQsNzUpIiAvPgo8cmVjdCB4PSIxNDQiIHk9IjM2IiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHN0eWxlPSJmaWxsOnJnYig5MywyMTQsNzUpIiAvPgo8cmVjdCB4PSIxODAiIHk9IjM2IiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHN0eWxlPSJmaWxsOnJnYig5MywyMTQsNzUpIiAvPgo8cmVjdCB4PSIwIiB5PSI3MiIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoNjcsMTkxLDEzNCkiIC8+CjxyZWN0IHg9IjM2IiB5PSI3MiIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoNjcsMTkxLDEzNCkiIC8+CjxyZWN0IHg9IjcyIiB5PSI3MiIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoMTQ4LDIzMiw1NikiIC8+CjxyZWN0IHg9IjEwOCIgeT0iNzIiIHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiIgc3R5bGU9ImZpbGw6cmdiKDE0OCwyMzIsNTYpIiAvPgo8cmVjdCB4PSIxNDQiIHk9IjcyIiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHN0eWxlPSJmaWxsOnJnYig2NywxOTEsMTM0KSIgLz4KPHJlY3QgeD0iMTgwIiB5PSI3MiIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoNjcsMTkxLDEzNCkiIC8+CjxyZWN0IHg9IjAiIHk9IjEwOCIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoOTMsMjE0LDc1KSIgLz4KPHJlY3QgeD0iMzYiIHk9IjEwOCIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoOTMsMjE0LDc1KSIgLz4KPHJlY3QgeD0iNzIiIHk9IjEwOCIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoOTMsMjE0LDc1KSIgLz4KPHJlY3QgeD0iMTA4IiB5PSIxMDgiIHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiIgc3R5bGU9ImZpbGw6cmdiKDkzLDIxNCw3NSkiIC8+CjxyZWN0IHg9IjE0NCIgeT0iMTA4IiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHN0eWxlPSJmaWxsOnJnYig5MywyMTQsNzUpIiAvPgo8cmVjdCB4PSIxODAiIHk9IjEwOCIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoOTMsMjE0LDc1KSIgLz4KPHJlY3QgeD0iMCIgeT0iMTQ0IiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHN0eWxlPSJmaWxsOnJnYig2NywxOTEsMTM0KSIgLz4KPHJlY3QgeD0iMzYiIHk9IjE0NCIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoMjI2LDI1NSwyMjIpIiAvPgo8cmVjdCB4PSI3MiIgeT0iMTQ0IiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHN0eWxlPSJmaWxsOnJnYig5MywyMTQsNzUpIiAvPgo8cmVjdCB4PSIxMDgiIHk9IjE0NCIgd2lkdGg9IjM2IiBoZWlnaHQ9IjM2IiBzdHlsZT0iZmlsbDpyZ2IoOTMsMjE0LDc1KSIgLz4KPHJlY3QgeD0iMTQ0IiB5PSIxNDQiIHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiIgc3R5bGU9ImZpbGw6cmdiKDIyNiwyNTUsMjIyKSIgLz4KPHJlY3QgeD0iMTgwIiB5PSIxNDQiIHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiIgc3R5bGU9ImZpbGw6cmdiKDY3LDE5MSwxMzQpIiAvPgo8cmVjdCB4PSIwIiB5PSIxODAiIHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiIgc3R5bGU9ImZpbGw6cmdiKDkzLDIxNCw3NSkiIC8+CjxyZWN0IHg9IjM2IiB5PSIxODAiIHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiIgc3R5bGU9ImZpbGw6cmdiKDY3LDE5MSwxMzQpIiAvPgo8cmVjdCB4PSI3MiIgeT0iMTgwIiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHN0eWxlPSJmaWxsOnJnYigyMjYsMjU1LDIyMikiIC8+CjxyZWN0IHg9IjEwOCIgeT0iMTgwIiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHN0eWxlPSJmaWxsOnJnYigyMjYsMjU1LDIyMikiIC8+CjxyZWN0IHg9IjE0NCIgeT0iMTgwIiB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHN0eWxlPSJmaWxsOnJnYig2NywxOTEsMTM0KSIgLz4KPHJlY3QgeD0iMTgwIiB5PSIxODAiIHdpZHRoPSIzNiIgaGVpZ2h0PSIzNiIgc3R5bGU9ImZpbGw6cmdiKDkzLDIxNCw3NSkiIC8+Cjwvc3ZnPgo=',
              available: true,
              coach_content: false,
              lang: lang,
              license_description: null,
              license_name: 'CC-BY',
              license_owner: 'Me',
              num_coach_contents: 0,
              parent: '862381f7848346b1bd3fdea86042d1e0',
              sort_order: 1,
            },
          ],
        });
      }
      /*
       * Method to query a single contentnodes from Kolibri and return
       * a metadata object
       * @param {string} id - id of the ContentNode
       * @return {Promise<ContentNode>} - a Promise that resolves to a ContentNode
       */
      getContentById() {}
      /*
       * Method to search for contentnodes on Kolibri and return
       * an array of matching metadata
       * @param {Object} options - The different options to search by
       * @param {string=} options.keyword - search term for key word search
       * @param {string=} options.under - id of topic to search under, or 'self'
       * @param {number} [options.page=1] - which page to return from the result set
       * @param {number} [options.pageSize=50] - the page size for pagination
       * @return {Promise<PageResult>} - a Promise that resolves to an array of ContentNodes
       */
      searchContent() {}

      /*
       * Method to set a default theme for any content rendering initiated by this app
       * @param {Theme} options - The different options for custom themeing
       * @return {Promise} - a Promise that resolves when the theme has been applied
       */
      themeRenderer() {}

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
      navigateTo() {
        window.alert('Navigating to node_id');
      }

      /*
       * Method to allow updating of stored state in the URL
       * @param {NavigationContext} context - context describing the state update
       * @return {Promise} - a Promise that resolves when the context has been updated
       */
      updateContext() {}

      /*
       * Method to request the current context state
       * @return {Promise<NavigationContext>} - a Promise that resolves
       * when the context has been updated
       */
      getContext() {}
    }
    this.shim = new Shim();
    return this.shim;
  }
}
