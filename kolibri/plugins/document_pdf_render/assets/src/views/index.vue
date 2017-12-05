<template>

  <div
    ref="docViewer"
    class="doc-viewer"
    :style="minViewerHeight"
    :class="{ 'doc-viewer-mimic-fullscreen': mimicFullscreen }"
    allowfullscreen>

    <k-button
      class="btn doc-viewer-controls button-fullscreen"
      aria-controls="pdf-container"
      :text="isFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      :primary="true"
      @click="toggleFullscreen"
    />

    <ui-icon-button
      class="doc-viewer-controls button-zoom-in"
      :class="{'short-display': shortDisplay}"
      aria-controls="pdf-container"
      icon="add"
      size="large"
      @click="zoomIn" />
    <ui-icon-button
      class="doc-viewer-controls button-zoom-out"
      :class="{'short-display': shortDisplay}"
      aria-controls="pdf-container"
      icon="remove"
      size="large"
      @click="zoomOut" />

    <div ref="pdfContainer" id="pdf-container" @scroll="checkPages">
      <progress-bar v-if="documentLoading" class="progress-bar" :showPercentage="true" :progress="progress" />
      <page-component
        class="pdf-page-container"
        v-for="(page, index) in pdfPages"
        :key="index"
        :ref="pageRef(index + 1)"
        :pdfPage="page"
        :defaultHeight="pageHeight"
        :defaultWidth="pageWidth"
        :scale="scale"
        :pageNum="index + 1" />
    </div>
  </div>

</template>


<script>

  import PDFJSLib from 'pdfjs-dist';
  import ScreenFull from 'screenfull';
  import kButton from 'kolibri.coreVue.components.kButton';
  import progressBar from 'kolibri.coreVue.components.progressBar';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { sessionTimeSpent } from 'kolibri.coreVue.vuex.getters';
  import throttle from 'lodash/throttle';
  import debounce from 'lodash/debounce';
  import pageComponent from './pageComponent';

  // Source from which PDFJS loads its service worker, this is based on the __publicPath
  // global that is defined in the Kolibri webpack pipeline, and the additional entry in the PDF renderer's
  // own webpack config
  PDFJSLib.PDFJS.workerSrc = `${__publicPath}pdfJSWorker-${__version}.js`;

  // Number of pages before and after current visible to keep rendered
  const pageDisplayWindow = 1;
  // How often should we respond to changes in scrolling to render new pages?
  const renderDebounceTime = 300;
  // Minimum height of the PDF viewer in pixels
  const minViewerHeight = 400;

  const scaleIncrement = 0.25;

  export default {
    name: 'pdfRender',
    components: {
      kButton,
      progressBar,
      uiIconButton,
      pageComponent,
    },
    mixins: [responsiveWindow, responsiveElement],
    props: ['defaultFile'],
    data: () => ({
      isFullscreen: false,
      progress: 0,
      scale: null,
      timeout: null,
      totalPages: null,
      pageHeight: null,
      pageWidth: null,
      pdfPages: [],
    }),
    computed: {
      fullscreenAllowed() {
        return ScreenFull.enabled;
      },
      pdfURL() {
        return this.defaultFile.storage_url;
      },
      mimicFullscreen() {
        return !this.fullscreenAllowed && this.isFullscreen;
      },
      shortDisplay() {
        return this.elSize.height === minViewerHeight;
      },
      minViewerHeight() {
        return `min-height: ${minViewerHeight}px`;
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

        if (!noChange && !firstChange) {
          // remove all rendered/rendering pages
          Object.keys(this.pdfPages).forEach(pageNum => {
            this.hidePage(Number(pageNum));
          });
        }
        // find and re-render necessary pages
        this.checkPages();
      },
    },
    created() {
      if (this.fullscreenAllowed) {
        ScreenFull.onchange(() => {
          this.isFullscreen = ScreenFull.isFullscreen;
        });
      }

      const loadPdfPromise = PDFJSLib.getDocument(this.defaultFile.storage_url);

      // pass callback to update loading bar
      loadPdfPromise.onProgress = loadingProgress => {
        this.progress = loadingProgress.loaded / loadingProgress.total;
      };

      this.prepComponentData = loadPdfPromise.then(pdfDocument => {
        // Get initial info from the loaded pdf document
        this.pdfDocument = pdfDocument;
        this.totalPages = pdfDocument.numPages;
        // Set pdfPages to an array of length total pages
        this.pdfPages = Array(this.totalPages);

        return this.getPage(1).then(firstPage => {
          const pageMargin = 5;
          const pdfPageWidth = firstPage.view[2];
          const isDesktop = this.windowSize.breakpoint >= 5;

          if (isDesktop) {
            // if desktop, use default page's default scale size
            this.scale = 1;
          } else {
            // if anything else, use max width
            this.scale = (this.elSize.width - 2 * pageMargin) / pdfPageWidth;
          }

          // set default height and width properties, used in checkPages
          const initialViewport = firstPage.getViewport(this.scale);
          this.pageHeight = initialViewport.height;
          this.pageWidth = initialViewport.width;
          // Set the firstPage into the pdfPages object so that we do not refetch the page
          // from PDFJS when we do our initial render
          this.pdfPages.splice(0, 1, firstPage);
        });
      });
    },
    mounted() {
      // Retrieve the document and its corresponding object
      this.prepComponentData.then(() => {
        this.$emit('startTracking');
        this.checkPages();
        // Automatically master after the targetTime, convert seconds -> milliseconds
        this.timeout = setTimeout(this.updateProgress, this.targetTime * 1000);
      });
    },
    beforeDestroy() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.updateProgress();
      this.pdfDocument.cleanup();
      this.pdfDocument.destroy();
      this.$emit('stopTracking');
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
      getPage(pageNum) {
        return this.pdfDocument.getPage(pageNum);
      },
      showPage(pageNum) {
        if (pageNum <= this.totalPages && pageNum > 0) {
          const pageIndex = pageNum - 1;
          if (!this.pdfPages[pageIndex]) {
            // Only bother getting it if the pdfPage object is not already cached in the array
            // Cache the getPage promise in the array to prevent multiple gets, then replace it with
            // the page once it has been fetched
            this.pdfPages.splice(
              pageIndex,
              1,
              this.getPage(pageNum).then(pdfPage => {
                this.pdfPages.splice(pageIndex, 1, pdfPage);
                this.$refs[this.pageRef(pageNum)][0].active = true;
              })
            );
          } else {
            this.$refs[this.pageRef(pageNum)][0].active = true;
          }
        }
      },
      hidePage(pageNum) {
        if (pageNum <= this.totalPages && pageNum > 0) {
          // Only try to hide possibly existing pages.
          this.$refs[this.pageRef(pageNum)][0].active = false;
        }
      },
      pageRef(index) {
        return `pdfPage-${index}`;
      },
      // debouncing so we're not de/re-render many pages unnecessarily
      checkPages: debounce(function() {
        // Calculate the position of the visible top and the bottom of the pdfContainer
        const top = this.$refs.pdfContainer.scrollTop;
        const bottom = top + this.$refs.pdfContainer.clientHeight;
        // Then work out which pages are visible to the user as a consequence
        // Loop through all pages, show ones that are in the display window, hide ones that aren't
        let cumulativeHeight = 0;
        const pagesToDisplay = [];
        let i, display;
        for (i = 1; i <= this.totalPages; i++) {
          // If the current cumulativeHeight (which marks the beginning of this page)
          // is higher than top and less than bottom, then this page
          // should be displayed
          display = false;
          const pageHeight = this.$refs[this.pageRef(i)][0].pageHeight;
          // Top of page is in the middle of the viewport
          if (cumulativeHeight >= top && cumulativeHeight <= bottom) {
            display = true;
          }
          // Page top and bottom wrap the viewport
          if (cumulativeHeight <= top && cumulativeHeight + pageHeight >= bottom) {
            display = true;
          }
          cumulativeHeight += pageHeight;
          // Bottom of page is in the middle of the viewport
          if (cumulativeHeight >= top && cumulativeHeight <= bottom) {
            display = true;
          }
          pagesToDisplay.push(display);
        }
        for (i = 1; i <= this.totalPages; i++) {
          // Render pages conditionally on pagesToDisplay, taking into account the display window
          if (
            pagesToDisplay
              .slice(
                Math.max(0, i - 1 - pageDisplayWindow),
                Math.min(pagesToDisplay.length, i - 1 + pageDisplayWindow)
              )
              .some(trueOrFalse => trueOrFalse)
          ) {
            this.showPage(i);
          } else {
            this.hidePage(i);
          }
        }
        // update progress after we determine which pages to render
        this.updateProgress();
      }, renderDebounceTime),
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
  // Defined here and in pdfPage.vue
  $page-padding = 5px

  .doc-viewer
    position: relative
    height: 100vh
    max-height: calc(100vh - 20em)
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

  #pdf-container
    height: 100%
    overflow-y: scroll
    text-align: center
    background-color: $core-text-default

    // prevents a never-visible spot underneath the fullscreen button
    padding-top: $fullscreen-button-height + $page-padding

  .doc-viewer-controls
    z-index: 6 // material spec - snackbar and FAB

  .button
    &-fullscreen
      transform: translateX(-50%)
      left: 50%
      top: $page-padding

    &-zoom
      &-in, &-out
        right: ($keen-button-height / 2)
      &-in
        bottom: $keen-button-height * 2.5
      &-out
        bottom: $keen-button-height

      // Align to top when there's a chance bottom-aligned controls are below the fold
      &-in.short-display
        top: $keen-button-height
      &-out.short-display
        top: $keen-button-height * 2.5


  .progress-bar
    top: 50%
    margin: 0 auto
    max-width: 200px

</style>
