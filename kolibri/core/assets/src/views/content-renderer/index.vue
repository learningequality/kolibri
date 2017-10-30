<template>

  <div>
    <ui-alert v-if="noRendererAvailable" :dismissible="false" type="error">
      {{ $tr('rendererNotAvailable') }}
    </ui-alert>
    <div v-else-if="available" class="fill-height">
      <div class="content-wrapper">
        <loading-spinner id="spinner" v-if="!currentViewClass" />
        <component
          v-else
          :is="currentViewClass"
          @startTracking="startTracking"
          @stopTracking="stopTracking"
          @updateProgress="updateProgress"
          @answerGiven="answerGiven"
          @hintTaken="hintTaken"
          @itemError="itemError"
          @interaction="interaction"
          :files="availableFiles"
          :defaultFile="defaultFile"
          :itemId="itemId"
          :answerState="answerState"
          :allowHints="allowHints"
          :supplementaryFiles="supplementaryFiles"
          :thumbnailFiles="thumbnailFiles"
          :interactive="interactive"
          :lang="lang"
          ref="contentView"
        />
      </div>
    </div>
    <div v-else>
      {{ $tr('msgNotAvailable') }}
    </div>
    <slot></slot>
  </div>

</template>


<script>

  import logger from 'kolibri.lib.logging';
  const logging = logger.getLogger(__filename);
  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';
  import uiAlert from 'keen-ui/src/UiAlert';
  import { defaultLanguage, languageValidator } from 'kolibri.utils.i18n';
  export default {
    name: 'contentRender',
    $trs: {
      msgNotAvailable: 'This content is not available',
      rendererNotAvailable: 'Kolibri is unable to render this content',
    },
    components: {
      loadingSpinner,
      uiAlert,
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
      assessment: {
        type: Boolean,
        default: false,
      },
      itemId: { default: null },
      answerState: { default: null },
      allowHints: {
        type: Boolean,
        default: true,
      },
      initSession: {
        type: Function,
        default: () => Promise.resolve(),
      },
      // Allow content renderers to display in a static mode
      // where user interaction is not allowed
      interactive: {
        type: Boolean,
        default: true,
      },
      lang: {
        type: Object,
        default: () => defaultLanguage,
        validator: languageValidator,
      },
    },
    data: () => ({
      currentViewClass: null,
      noRendererAvailable: false,
    }),
    computed: {
      extension() {
        if (this.availableFiles.length > 0) {
          return this.availableFiles[0].extension;
        }
        return undefined;
      },
      availableFiles() {
        return this.files.filter(file => !file.thumbnail && !file.supplementary && file.available);
      },
      defaultFile() {
        return this.availableFiles && this.availableFiles.length ? this.availableFiles[0] : undefined;
      },
      supplementaryFiles() {
        return this.files.filter(file => file.supplementary && file.available);
      },
      thumbnailFiles() {
        return this.files.filter(file => file.thumbnail && file.available);
      },
    },
    created() {
      this.updateRendererComponent();
      // This means this component has to be torn down on channel switches.
      this.$watch('files', this.updateRendererComponent);
    },
    methods: {
      /* Check the Kolibri core app for a content renderer module that is able to
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
            this.initSession(),
            this.Kolibri.retrieveContentRenderer(this.kind, this.extension),
          ])
            .then(([session, component]) => {
              this.$emit('sessionInitialized', session);
              this.currentViewClass = component;
              return this.currentViewClass;
            })
            .catch(error => {
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
      interaction(...args) {
        this.$emit('interaction', ...args);
      },
      updateProgress(...args) {
        this.$emit('updateProgress', ...args);
      },
      startTracking(...args) {
        this.$emit('startTracking', ...args);
      },
      stopTracking(...args) {
        this.$emit('stopTracking', ...args);
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
