<template>

  <div class="content-renderer">
    <UiAlert v-if="noRendererAvailable" :dismissible="false" type="error">
      {{ $tr('rendererNotAvailable') }}
    </UiAlert>
    <template v-else-if="available">
      <transition mode="out-in">
        <KCircularLoader
          v-if="!currentViewClass"
          :delay="false"
        />
        <component
          :is="currentViewClass"
          v-else
          ref="contentView"
          class="content-renderer-component"
          v-bind="$props"
          @startTracking="startTracking"
          @stopTracking="stopTracking"
          @updateProgress="updateProgress"
          @updateContentState="updateContentState"
          @answerGiven="answerGiven"
          @hintTaken="hintTaken"
          @itemError="itemError"
          @interaction="interaction"
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
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRendererMixin';

  import UiAlert from 'keen-ui/src/UiAlert';

  const logging = logger.getLogger(__filename);

  export default {
    name: 'ContentRenderer',
    components: {
      UiAlert,
    },
    mixins: [contentRendererMixin],
    props: {
      initSession: {
        type: Function,
        default: () => Promise.resolve(),
      },
    },
    data: () => ({
      currentViewClass: null,
      noRendererAvailable: false,
    }),
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
        // and the preset are defined.
        // Otherwise the template can handle it.
        if (this.preset) {
          return Promise.all([
            this.initSession(),
            this.Kolibri.retrieveContentRenderer(this.preset),
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
        heartbeat.setUserActive();
      },
      hintTaken(...args) {
        this.$emit('hintTaken', ...args);
        heartbeat.setUserActive();
      },
      itemError(...args) {
        this.$emit('itemError', ...args);
        heartbeat.setUserActive();
      },
      interaction(...args) {
        this.$emit('interaction', ...args);
        heartbeat.setUserActive();
      },
      updateProgress(...args) {
        this.$emit('updateProgress', ...args);
        heartbeat.setUserActive();
      },
      updateContentState(...args) {
        this.$emit('updateContentState', ...args);
        heartbeat.setUserActive();
      },
      startTracking(...args) {
        this.$emit('startTracking', ...args);
        heartbeat.setUserActive();
      },
      stopTracking(...args) {
        this.$emit('stopTracking', ...args);
      },
      /**
       * @public
       */
      checkAnswer() {
        if (this.$refs.contentView && this.$refs.contentView.checkAnswer) {
          return this.$refs.contentView.checkAnswer();
        } else if (!this.$refs.contentView) {
          logging.warn('No content view to check answer of');
        } else if (!this.$refs.contentView.checkAnswer) {
          logging.warn('This content renderer has not implemented the checkAnswer method');
        }
        heartbeat.setUserActive();
        return null;
      },
    },
    $trs: {
      msgNotAvailable: 'This content is not available',
      rendererNotAvailable: 'Kolibri is unable to render this content',
    },
  };

</script>


<style lang="scss" scoped></style>
