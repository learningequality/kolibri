<template>

  <div
    ref="docViewer"
    class="doc-viewer"
    :class="{ 'doc-viewer-mimic-fullscreen': mimicFullscreen }"
    allowfullscreen
  >

    <k-button
      class="btn doc-viewer-controls button-fullscreen"
      aria-controls="pdf-container"
      :text="isFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      :primary="true"
      @click="toggleFullscreen"
    />

    <ui-icon-button
      class="doc-viewer-controls button-prev-page"
      aria-controls="pdf-container"
      :icon="isRtl? 'chevron_right' : 'chevron_left'"
      size="large"
      @click="prevPage"
    />
    <ui-icon-button
      class="doc-viewer-controls button-next-page"
      aria-controls="pdf-container"
      :icon="isRtl? 'chevron_left' : 'chevron_right'"
      size="large"
      @click="nextPage"
    />

    <div
      ref="epubContainer"
      id="epub-container"
      :class="{ 'doc-viewer-mimic-fullscreen': mimicFullscreen }"
    >
    </div>
  </div>

</template>


<script>

  import Epub from 'epubjs/lib/epub';
  import manager from 'epubjs/lib/managers/default';
  import iFrameView from 'epubjs/lib/managers/views/iframe';
  import ScreenFull from 'screenfull';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRenderer';
  import { sessionTimeSpent } from 'kolibri.coreVue.vuex.getters';
  import throttle from 'lodash/throttle';

  // How often should we respond to changes in scrolling to render new pages?
  const renderDebounceTime = 300;

  const scaleIncrement = 0.25;

  export default {
    name: 'epubRender',
    components: {
      kButton,
      uiIconButton,
    },
    mixins: [responsiveWindow, responsiveElement, contentRendererMixin],
    data: () => ({
      isFullscreen: false,
      progress: 0,
      timeout: null,
      totalPages: null,
    }),
    computed: {
      fullscreenAllowed() {
        return ScreenFull.enabled;
      },
      epubURL() {
        return this.defaultFile.storage_url;
      },
      mimicFullscreen() {
        return !this.fullscreenAllowed && this.isFullscreen;
      },
      targetTime() {
        return this.totalPages * 30;
      },
      documentLoading() {
        return this.progress !== 1;
      },
    },
    watch: {
      scrollPos: 'checkPages',
      scale(newScale, oldScale) {
        // Listen to changes in scale, as we have to rerender every visible page if it changes.
        const noChange = newScale === oldScale;
        const firstChange = oldScale === null;

        if (!noChange && !firstChange && this.renderer) {
          this.renderer.resize(this.defaultWidth * newScale, this.defaultHeight * newScale);
        }
      },
    },
    created() {
      global.ePub = Epub;
      this.book = new Epub(this.epubURL);
      if (this.fullscreenAllowed) {
        ScreenFull.onchange(() => {
          this.isFullscreen = ScreenFull.isFullscreen;
        });
      }
    },
    mounted() {
      this.renderer = this.book.renderTo(this.$refs.epubContainer, {
        manager,
        view: iFrameView,
      });
      this.renderer.display();
    },
    beforeDestroy() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.updateProgress();
      this.$emit('stopTracking');
    },
    destroy() {
      delete global.ePub;
    },
    methods: {
      toggleFullscreen() {
        if (this.fullscreenAllowed) {
          ScreenFull.toggle(this.$refs.docViewer);
        } else {
          this.isFullscreen = !this.isFullscreen;
        }
      },
      zoomIn: throttle(function() {
        this.scale += scaleIncrement;
      }, renderDebounceTime),
      zoomOut: throttle(function() {
        this.scale -= scaleIncrement;
      }, renderDebounceTime),
      nextPage() {
        this.renderer.next();
      },
      prevPage() {
        this.renderer.prev();
      },
      updateProgress() {
        this.$emit('updateProgress', this.sessionTimeSpent / this.targetTime);
      },
    },
    $trs: {
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
    },
    vuex: {
      getters: {
        sessionTimeSpent,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $keen-button-height = 48px
  $fullscreen-button-height = 36px
  $page-padding = 5px

  .doc-viewer
    position: relative
    width: 90%
    margin-left: auto
    margin-right: auto

    &:fullscreen
      width: 100%
      height: 100%
      min-height: inherit
      max-height: inherit

    &-mimic-fullscreen
      position: fixed
      top: 0
      right: 0
      bottom: 0
      left: 0
      z-index: 24
      max-width: 100%
      max-height: 100%
      width: 100%
      height: 100%

    &-controls
      position: absolute

  #epub-container
    height: 100%
    background-color: #FFFFFF

    // prevents a never-visible spot underneath the fullscreen button
    padding-top: $fullscreen-button-height + $page-padding
    padding-bottom: $page-padding

  .doc-viewer-controls
    z-index: 6 // material spec - snackbar and FAB

  .button
    &-fullscreen
      transform: translateX(-50%)
      left: 50%
      top: $page-padding

    &-prev-page
      left: ($keen-button-height / 2)
      top: $page-padding

    &-next-page
      right: ($keen-button-height / 2)
      top: $page-padding

</style>
