<template>

  <div
    ref="html5Renderer"
    class="html5-renderer"
    allowfullscreen
  >
    <ui-icon-button
      class="btn"
      :ariaLabel="isInFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      color="primary"
      size="large"
      @click="toggleFullscreen($refs.html5Renderer)"
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
  </div>

</template>


<script>

  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRenderer';
  import fullscreen from 'kolibri.coreVue.mixins.fullscreen';
  import uiIconButton from 'keen-ui/src/UiIconButton';

  export default {
    name: 'html5Renderer',
    components: {
      uiIconButton,
    },
    mixins: [contentRendererMixin, fullscreen],
    props: {
      defaultFile: {
        type: Object,
        required: true,
      },
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


<style lang="stylus" scoped>

  .btn
    position: absolute
    right: 21px
    top: 8px
    fill: white

  .html5-renderer
    position: relative
    text-align: center
    height: 500px
    overflow-x: auto
    overflow-y: hidden

  .iframe
    height: 100%
    width: 100%

</style>
