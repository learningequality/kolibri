<template>

  <div>
    <ui-alert v-if="noRendererAvailable" :dismissible="false" type="error">
      {{ $tr('rendererNotAvailable') }}
    </ui-alert>
    <div v-else-if="available" class="fill-height">
      <div class="content-wrapper">
        <loading-spinner id="spinner" v-if="!currentViewClass"/>
        <template v-else>
          <component v-if="coachMode" :is="currentViewClass"
          @itemError="itemError"
          :files="availableFiles"
          :defaultFile="defaultFile"
          :itemId="itemId"
          :answerState="answerState"
          ref="contentView"
          />
          <component v-else :is="currentViewClass"
          @startTracking="wrappedStartTracking"
          @stopTracking="stopTracking"
          @updateProgress="updateProgress"
          @answerGiven="answerGiven"
          @hintTaken="hintTaken"
          @itemError="itemError"
          :files="availableFiles"
          :defaultFile="defaultFile"
          :itemId="itemId"
          :answerState="answerState"
          ref="contentView"
          />
        </template>
      </div>
    </div>
    <div v-else>
      {{ $tr('msgNotAvailable') }}
    </div>
    <slot/>
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
      coachMode: {
        type: Boolean,
        default: false,
      },
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
      assessment: {
        type: Boolean,
        default: false,
      },
      itemId: {
        default: null,
      },
      answerState: {
        default: null,
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
          return Promise.all([
            this.initSession(this.channelId, this.contentId, this.kind),
            this.Kolibri.retrieveContentRenderer(this.kind, this.extension)
          ]).then(([session, component]) => {
            this.$emit('sessionInitialized');
            this.currentViewClass = component;
            return this.currentViewClass;
          }).catch((error) => {
            logging.error(error);
            this.noRendererAvailable = true;
          });
        }
        return Promise.resolve(null);
      },
      answerGiven(...args) {
        this.$emit('answerGiven', ...args);
      },
      hintTaken(...args) {
        this.$emit('hintTaken', ...args);
      },
      itemError(...args) {
        this.$emit('itemError', ...args);
      },
      wrappedStartTracking() {
        // Assume that as soon as we have started tracking data for this content item,
        // our ContentNode cache is no longer valid.
        this.Kolibri.resources.ContentNodeResource.unCacheModel(this.id, {
          channel_id: this.channelId
        });
        this.startTracking();
      },
      checkAnswer() {
        if (this.assessment && this.$refs.contentView && this.$refs.contentView.checkAnswer) {
          return this.$refs.contentView.checkAnswer();
        } else if (!this.assessment) {
          logging.warn('Checking answer of something that is not an assessment');
        } else if (!this.$refs.contentView) {
          logging.warn('No content view to check answer of');
        } else if (!this.$refs.contentView.checkAnswer) {
          logging.warn('This content renderer has not implemented the checkAnswer method');
        }
        return null;
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
