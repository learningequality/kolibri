<template>

  <fullscreen
    ref="html5Renderer"
    class="html5-renderer"
    @changeFullscreen="isInFullscreen = $event"
  >
    <ui-icon-button
      class="btn"
      :ariaLabel="isInFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      color="primary"
      size="large"
      @click="$refs.html5Renderer.toggleFullscreen()"
    >
      <mat-svg v-if="isInFullscreen" name="fullscreen_exit" category="navigation" />
      <mat-svg v-else name="fullscreen" category="navigation" />
    </ui-icon-button>
    <iframe
      class="iframe"
      sandbox="allow-scripts"
      frameBorder="0"
      :src="rooturl"
    >
    </iframe>
  </fullscreen>

</template>


<script>

  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRenderer';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import fullscreen from 'kolibri.coreVue.components.fullscreen';

  export default {
    name: 'html5Renderer',
    components: {
      uiIconButton,
      fullscreen,
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
      rooturl() {
        return this.defaultFile.storage_url;
      },
    },
    mounted() {
      this.$emit('startTracking');
      const self = this;
      this.timeout = setTimeout(() => {
        self.$emit('updateProgress', 1);
      }, 15000);
    },
    beforeDestroy() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.$emit('stopTracking');
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
