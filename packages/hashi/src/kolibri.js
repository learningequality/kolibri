/**
 * This class offers an API interface for interacting directly with the Kolibri app
 * that the HTML5 app is embedded within
 */
import BaseShim from './baseShim';
import Mediator from './mediator';
import { events, nameSpace, DataTypes } from './hashiBase';

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
    this.mediator = new Mediator(window.parent);
  }

  iframeInitialize(contentWindow) {
    this.__setShimInterface();
    Object.defineProperty(contentWindow, this.nameSpace, {
      value: this.shim,
      configurable: true,
    });
  }

  __setShimInterface() {
    const self = this;

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
      getContentByFilter(options) {
        return self.mediator.sendMessageAwaitReply({
          event: events.DATAREQUESTED,
          data: { options, dataType: DataTypes.COLLECTION },
          nameSpace,
        });
      }
      /*
       * Method to query a single contentnode from Kolibri and return
       * a metadata object
       * @param {string} id - id of the ContentNode
       * @return {Promise<ContentNode>} - a Promise that resolves to a ContentNode
       */
      getContentById(id) {
        return self.mediator.sendMessageAwaitReply({
          event: events.DATAREQUESTED,
          data: { id, dataType: DataTypes.MODEL },
          nameSpace,
        });
      }
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
      searchContent(options) {
        return self.mediator.sendMessageAwaitReply({
          event: events.DATAREQUESTED,
          data: { options, dataType: DataTypes.SEARCHRESULT },
          nameSpace,
        });
      }

      /*
       * Method to set a default theme for any content rendering initiated by this app
       * @param {Theme} options - The different options for custom themeing
       * @param {string} options.appBarColor - Color for app bar atop the renderer
       * @param {string} options.textColor - Color for the text or icon
       * @param {string} [options.backdropColor] - Color for modal backdrop
       * @param {string} [options.backgroundColor] - Color for modal background
       * @return {Promise} - a Promise that resolves when the theme has been applied
       */
      themeRenderer(options) {
        return self.mediator.sendMessageAwaitReply({
          event: events.THEMECHANGED,
          data: options,
          nameSpace,
        });
      }

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
      navigateTo(nodeId, context) {
        return self.mediator.sendMessageAwaitReply({
          event: events.NAVIGATETO,
          data: { nodeId, context },
          nameSpace,
        });
      }

      /*
       * Method to allow updating of stored state in the URL
       * @param {NavigationContext} context - context describing the state update
       * @return {Promise} - a Promise that resolves when the context has been updated
       */
      updateContext(context) {
        return self.mediator.sendMessageAwaitReply({
          event: events.CONTEXT,
          data: { context },
          nameSpace,
        });
      }

      /*
       * Method to request the current context state
       * @return {Promise<NavigationContext>} - a Promise that resolves
       * when the context has been updated
       */
      getContext() {
        return self.mediator.sendMessageAwaitReply({
          event: events.CONTEXT,
          data: {},
          nameSpace,
        });
      }

      /*
       * Method to return the current version of Kolibri and hence the API available.
       * @return {Promise<string>} - A version string
       */
      getVersion() {
        return self.mediator.sendMessageAwaitReply({
          event: events.DATAREQUESTED,
          data: { dataType: DataTypes.KOLIBRIVERSION },
          nameSpace,
        });
      }
    }

    this.shim = new Shim();
    return this.shim;
  }
}
