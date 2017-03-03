<template>

  <div>
    <ui-alert v-if="noRendererAvailable" :dismissible="false" type="error">
        {{ $tr('rendererNotAvailable') }}
    </ui-alert>
    <div v-else-if="available" class="fill-height">
      <div class="content-wrapper">
        <loading-spinner id="spinner" v-if="!currentViewClass"/>
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
      msgNotAvailable: 'This content is not available',
      rendererNotAvailable: 'Kolibri is unable to render this content',
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
    components: {
      'loading-spinner': require('kolibri.coreVue.components.loadingSpinner'),
      'ui-alert': require('keen-ui/src/UiAlert'),
    },
    computed: {
      extension() {
        if (this.availableFiles.length > 0) {
          return this.availableFiles[0].extension;
        }
        return undefined;
      },
      availableFiles() {
        return this.files.filter(
          (file) => !file.thumbnail && !file.supplementary && file.available
        );
      },
      defaultFile() {
        return this.availableFiles &&
          this.availableFiles.length ? this.availableFiles[0] : undefined;
      },
    },
    created() {
      this.updateRendererComponent();
      // This means this component has to be torn down on channel switches.
      this.$watch('files', this.updateRendererComponent);
    },
    mounted() {
      this.ready = true;
      this.renderContent();
    },
    data: () => ({
      currentViewClass: null,
      noRendererAvailable: false,
    }),
    methods: {
      /**
       * Check the Kolibri core app for a content renderer module that is able to
       * handle the rendering of the current content node. This is the entrance point for changes
       * in the props,so any change in the props will trigger this function first.
       */
      updateRendererComponent() {
        // Assume we will find a renderer until we find out otherwise.
        this.noRendererAvailable = false;
        // Only bother to do this is if the node is available, and the kind and extension are defined.
        // Otherwise the template can handle it.
        if (this.available && this.kind && this.extension) {
          // The internal content rendering component is currently unrendered.
          this.rendered = false;
          return this.Kolibri.retrieveContentRenderer(this.kind, this.extension).then((component) => {
            this.currentViewClass = component;
            // If the Vue component is attached to the DOM, and it is unrendered, then render now!
            if (this.ready && !this.rendered) {
              this.renderContent();
            }
            return this.currentViewClass;
          }).catch((error) => {
            logging.error(error);
            this.noRendererAvailable = true;
          });
        }
        return Promise.resolve(null);
      },
      /**
       * Method that renders the dynamically retrieved component into the wrapper component.
       */
      renderContent() {
        // Only render if we have a component type to render and the content is available.
        if (this.currentViewClass !== null && this.available && !this.rendered) {
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
          for (let i = 0; i < properties.length; i += 1) {
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
          return this.initSession(this.channelId, this.contentId, this.kind).then(() => {
            // Instantiate the Vue instance directly using the Kolibri Vue constructor.
            this.contentView = new this.Kolibri.lib.vue(options); // eslint-disable-line new-cap

            this.contentView.$on('startTracking', this.wrappedStartTracking);
            this.contentView.$on('stopTracking', this.stopTracking);
            this.contentView.$on('progressUpdate', this.updateProgress);
          }, (reason) => {
            logging.error('initContentSession failed: ', reason);
          });
        }
        return null;
      },
      wrappedStartTracking() {
        // Assume that as soon as we have started tracking data for this content item,
        // our ContentNode cache is no longer valid.
        this.Kolibri.resources.ContentNodeResource.unCacheModel(this.id);
        this.startTracking();
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

  @require '~kolibri.styles.definitions'

  .fill-height
    height: 100%

  .content-wrapper
    height: 100%

  #spinner
    height: 160px

</style>
