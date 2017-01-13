<template>

  <div>
    <div v-if="available" class="fill-height">
      <div class="content-wrapper">
        <loading-spinner v-if="!currentViewClass"/>
        <div ref="container"></div>
      </div>
    </div>
    <div v-else>
      {{ $tr('msgNotAvailable') }}
    </div>
  </div>

</template>


<script>

  const logging = require('kolibri.lib.logging').getLogger(__filename);
  const actions = require('kolibri.coreVue.vuex.actions');

  module.exports = {
    $trNameSpace: 'contentRender',
    $trs: {
      msgNotAvailable: 'This content is not available.',
    },
    props: {
      id: {
        type: String,
        required: true,
      },
      kind: {
        type: String,
        required: true,
      },
      files: {
        type: Array,
        default: () => [],
      },
      contentId: {
        type: String,
        default: '',
      },
      channelId: {
        type: String,
        default: '',
      },
      available: {
        type: Boolean,
        default: false,
      },
      extraFields: {
        type: String,
        default: '{}',
      },
    },
    computed: {
      contentType() {
        if (typeof this.kind !== 'undefined' & typeof this.extension !== 'undefined') {
          return `${this.kind}/${this.extension}`;
        }
        return undefined;
      },
      extension() {
        if (this.availableFiles.length > 0) {
          return this.availableFiles[0].extension;
        }
        return undefined;
      },
      availableFiles() {
        return this.files.filter(
          (file) => !file.thumbnail & !file.supplementary & file.available
        );
      },
      defaultFile() {
        return this.availableFiles &&
          this.availableFiles.length ? this.availableFiles[0] : undefined;
      },
    },
    beforeCreate() {
      this._eventListeners = [];
    },
    created() {
      this.findRendererComponent();
      // This means this component has to be torn down on channel switches.
      this.$watch('files', this.findRendererComponent);
    },
    mounted() {
      this.ready = true;
      this.renderContent();
    },
    data: () => ({
      currentViewClass: null,
    }),
    methods: {
      /**
       * Clear any active listeners - this ensures that if the current content node changes,
       * but the previous one has not received its renderer callback, no shenanigans will occur.
       */
      clearListeners() {
        this._eventListeners.forEach((listener) => {
          this.Kolibri.off(listener.event, listener.callback);
        });
        this._eventListeners = [];
      },
      /**
       * Broadcast through the Kolibri core app for a content renderer module that is able to
       * handle the rendering of the current content node. This is the entrance point for changes
       * in the props,so any change in the props will trigger this function first.
       */
      findRendererComponent() {
        // Clear any existing listeners so that two renderings do not collide in this component.
        this.clearListeners();
        // Only bother to do this is if the node is available. Otherwise the template can handle it.
        if (this.available) {
          // The internal content rendering component is currently unrendered.
          this.rendered = false;
          // This is the event that content renderers will broadcast in response to our call.
          const event = `component_render:${this.contentType}`;
          // This is the method that will accept the component passed by the content renderer.
          const callback = this.setRendererComponent;
          // Set up listening for the response.
          this.Kolibri.once(event, callback);
          // Keep a track of this listener so that we can unbind it later if needed.
          this._eventListeners.push({ event, callback });
          // This is the event that is broadcast out to the content renderers.
          this.Kolibri.emit(`content_render:${this.contentType}`);
          logging.debug(`Looking for content renderer for ${this.contentType}`);
        }
      },
    /**
     * Method that is invoked by a callback from an event listener. Accepts a Vue component
     * options object as an argument. This is then set as the current renderer for the node,
     * and is used later in rendering.
     * @param {Object} component - an options object for a Vue component.
     */
      setRendererComponent(component) {
        // Keep track of the current renderer.
        this.currentViewClass = component;
        // If the Vue component is attached to the DOM, and it is unrendered, then render now!
        if (this.ready && !this.rendered) {
          this.renderContent();
        }
      },
      /**
       * Method that renders the dynamically retrieved component into the wrapper component.
       */
      renderContent() {
        // Only render if we have a component type to render and the content is available.
        if (this.currentViewClass !== null & this.available & !this.rendered) {
          // We are rendering, so don't let setRendererComponent call this again.
          this.rendered = true;
          // Start building up an object of all props that the content renderers might get passed.
          const propsData = {};
          // List enumerable properties of the props object.
          const enumerables = Object.keys(this.$options.props);
          // Only get non-inherited properties of the props object.
          const properties = Object.getOwnPropertyNames(this.$options.props).filter(
            // Only use non-enumerable, non-inherited properties of the props object.
            (name) => enumerables.indexOf(name) > -1
          );
          for (let i = 0; i < properties.length; i++) {
            const key = properties[i];
            // Loop through all the properties, see if one of them is extraFields.
            if (key !== 'extraFields') {
              // If it isn't just put it directly into the data.
              propsData[key] = this[key];
            } else {
              // If it is, then parse it as JSON and assign each key to the propsData.
              Object.assign(propsData, JSON.parse(this[key]));
            }
          }
          // Add a defaultFile to the propsData, which is the first file in the availableFiles.
          propsData.defaultFile = this.defaultFile;
          // Create an options object for the soon to be instantiated renderer component.
          const options = {
            name: 'content-renderer-child',
            // Set the parent so that it is in the Vue family.
            parent: this,
            // Let it mount on the DOM in the container div set up in the template.
            el: this.$refs.container,
            // Pass in the propsData!
            propsData,
          };
          // Add the specified options for the Vue component that we received from the plugin
          // into the options object.
          Object.assign(options, this.currentViewClass);

          // guarantee summarylog, sessionlog, and existing masterylog are synced and in store.
          this.initSession(this.Kolibri, this.channelId, this.contentId, this.kind).then(() => {
            // Instantiate the Vue instance directly using the Kolibri Vue constructor.
            this.contentView = new this.Kolibri.lib.vue(options); // eslint-disable-line new-cap

            this.contentView.$on('startTracking', this.wrappedStartTracking);
            this.contentView.$on('stopTracking', this.wrappedStopTracking);
            this.contentView.$on('progressUpdate', this.wrappedUpdateProgress);
          }, (reason) => {
            logging.error('initContentSession failed: ', reason);
          });
        }
      },
      wrappedStartTracking() {
        // Assume that as soon as we have started tracking data for this content item,
        // our ContentNode cache is no longer valid.
        this.Kolibri.resources.ContentNodeResource.unCacheModel(this.id);
        this.startTracking(this.Kolibri);
      },
      wrappedStopTracking() {
        this.stopTracking(this.Kolibri);
      },
      wrappedUpdateProgress(progress) {
        this.updateProgress(this.Kolibri, progress);
      },
    },
    vuex: {
      actions: {
        initSession: actions.initContentSession,
        updateProgress: actions.updateProgress,
        startTracking: actions.startTrackingProgress,
        stopTracking: actions.stopTrackingProgress,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .fill-height
    height: 100%

  .content-wrapper
    height: 100%

</style>
