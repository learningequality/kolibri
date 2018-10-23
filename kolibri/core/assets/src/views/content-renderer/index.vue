<template>

  <div class="content-renderer">
    <ui-alert v-if="noRendererAvailable" :dismissible="false" type="error">
      {{ $tr('rendererNotAvailable') }}
    </ui-alert>
    <template v-else-if="available">
      <transition mode="out-in">
        <k-circular-loader
          v-if="!currentViewClass"
          :delay="false"
        />
        <component
          class="content-renderer-component"
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
          :showCorrectAnswer="showCorrectAnswer"
          ref="contentView"
        />
      </transition>
    </template>
    <div v-else>
      {{ $tr('msgNotAvailable') }}
    </div>
  </div>

</template>


<script>

  import logger from 'kolibri.lib.logging';
  import heartbeat from 'kolibri.heartbeat';
  import kCircularLoader from 'kolibri.coreVue.components.kCircularLoader';
  import uiAlert from 'keen-ui/src/UiAlert';
  import { defaultLanguage, languageValidator } from 'kolibri.utils.i18n';

  const logging = logger.getLogger(__filename);

  export default {
    name: 'contentRender',
    $trs: {
      msgNotAvailable: 'This content is not available',
      rendererNotAvailable: 'Kolibri is unable to render this content',
    },
    components: {
      kCircularLoader,
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
      itemId: {
        type: String,
        default: null,
      },
      answerState: {
        type: Object,
        default: null,
      },
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
      showCorrectAnswer: {
        type: Boolean,
        default: false,
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
        return this.files.filter(
          file =>
            !file.thumbnail &&
            !file.supplementary &&
            file.available &&
            this.Kolibri.canRenderContent(this.kind, file.extension)
        );
      },
      defaultFile() {
        return this.availableFiles && this.availableFiles.length
          ? this.availableFiles[0]
          : undefined;
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
        // Only bother to do this is if the node is available,
        // and the kind and extension are defined.
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
        heartbeat.setActive();
      },
      hintTaken(...args) {
        this.$emit('hintTaken', ...args);
        heartbeat.setActive();
      },
      itemError(...args) {
        this.$emit('itemError', ...args);
        heartbeat.setActive();
      },
      interaction(...args) {
        this.$emit('interaction', ...args);
        heartbeat.setActive();
      },
      updateProgress(...args) {
        this.$emit('updateProgress', ...args);
        heartbeat.setActive();
      },
      startTracking(...args) {
        this.$emit('startTracking', ...args);
        heartbeat.setActive();
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
        heartbeat.setActive();
        return null;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .content-renderer-component
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.2),
                0 1px 1px 0 rgba(0, 0, 0, 0.14),
                0 2px 1px -1px rgba(0, 0, 0, 0.12)

</style>
