<template>

  <CoreFullscreen
    ref="html5Renderer"
    class="html5-renderer"
    @changeFullscreen="isInFullscreen = $event"
  >
    <UiIconButton
      class="btn"
      :ariaLabel="isInFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      color="primary"
      size="large"
      @click="$refs.html5Renderer.toggleFullscreen()"
    >
      <mat-svg v-if="isInFullscreen" name="fullscreen_exit" category="navigation" />
      <mat-svg v-else name="fullscreen" category="navigation" />
    </UiIconButton>
    <iframe
      ref="iframe"
      class="iframe"
      :style="{ backgroundColor: $coreBgCanvas }"
      sandbox="allow-scripts"
      frameBorder="0"
      :src="rooturl"
    >
    </iframe>
  </CoreFullscreen>

</template>


<script>

  import { mapGetters } from 'vuex';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRendererMixin';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';

  export default {
    name: 'Html5AppRendererIndex',
    components: {
      UiIconButton,
      CoreFullscreen,
    },
    mixins: [contentRendererMixin],
    props: {
      defaultFile: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        isInFullscreen: false,
      };
    },
    computed: {
      ...mapGetters(['$coreBgCanvas']),
      rooturl() {
        return this.defaultFile.storage_url;
      },
    },
    mounted() {
      this.iframeMessageReceived = this.iframeMessageReceived.bind(this);
      window.addEventListener('message', this.iframeMessageReceived, true);
      this.$emit('startTracking');
      const self = this;
      this.timeout = setTimeout(() => {
        self.$emit('updateProgress', 1);
      }, 15000);
    },
    beforeDestroy() {
      window.removeEventListener('message', this.iframeMessageReceived);
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.$emit('stopTracking');
    },
    methods: {
      iframeMessageReceived(event) {
        if (!event) {
          return;
        }
        const message = JSON.parse(event.data);
        if (message.action === 'stateUpdated') {
          this.$emit('updateContentState', message.params);
        } else if (message.action === 'hashiInitialized') {
          const iframe = this.$refs.iframe.contentWindow;

          // On guest access, the user will be signed out, so just return
          // an empty key value store in that case.
          let contentState = {};
          if (this.extraFields && this.extraFields.contentState) {
            contentState = this.extraFields.contentState;
          }
          const data = {
            action: 'kolibriDataLoaded',
            params: { data: contentState },
          };
          iframe.postMessage(JSON.stringify(data), '*');
        }
      },
    },
    $trs: {
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
    },
  };

</script>


<style lang="scss" scoped>

  .btn {
    position: absolute;
    top: 8px;
    right: 21px;
    fill: white;
  }

  .html5-renderer {
    position: relative;
    height: 500px;
    overflow-x: auto;
    overflow-y: hidden;
    text-align: center;
  }

  .iframe {
    width: 100%;
    height: 100%;
  }

</style>
