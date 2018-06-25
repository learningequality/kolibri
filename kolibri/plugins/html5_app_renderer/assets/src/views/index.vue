<template>

  <div
    ref="html5Renderer"
    class="html5-renderer"
    allowfullscreen
  >
    <k-button
      class="btn"
      :text="isInFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      @click="toggleFullscreen($refs.html5Renderer)"
      :primary="true"
    />
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

  import kButton from 'kolibri.coreVue.components.kButton';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRenderer';
  import fullscreen from 'kolibri.coreVue.mixins.fullscreen';

  export default {
    name: 'html5Renderer',
    components: { kButton },
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
    left: 50%
    transform: translateX(-50%)

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
