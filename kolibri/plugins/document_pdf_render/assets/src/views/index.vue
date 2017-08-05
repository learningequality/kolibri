<template>

  <div
    ref="docViewer"
    class="doc-viewer"
    :style="minViewerHeight"
    :class="{ 'container-mimic-fullscreen': mimicFullscreen }">

    <icon-button
      class="doc-viewer-controls button-fullscreen"
      aria-controls="pdf-container"
      v-if="supportsPDFs"
      :text="isFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      @click="toggleFullscreen"
      :primary="true">
      <mat-svg v-if="isFullscreen" class="icon" category="navigation" name="fullscreen_exit"/>
      <mat-svg v-else class="icon" category="navigation" name="fullscreen"/>
    </icon-button>

    <ui-icon-button
      class="doc-viewer-controls button-zoom-in"
      :class="{'short-display': shortDisplay}"
      aria-controls="pdf-container"
      icon="add"
      size="large"
      @click="zoomIn()"/>
      <ui-icon-button
      class="doc-viewer-controls button-zoom-out"
      :class="{'short-display': shortDisplay}"
      aria-controls="pdf-container"
      icon="remove"
      size="large"
      @click="zoomOut()"/>

    <div ref="pdfContainer" id="pdf-container" @scroll="checkPages">
      <progress-bar v-if="documentLoading" class="progress-bar" :show-percentage="true" :progress="progress"/>
      <section class="pdf-page-container" v-for="index in totalPages"
        :ref="pageRef(index)"
        :style="{ height: pageHeight + 'px', width: pageWidth + 'px' }">
        <span class="pdf-page-loading"> {{$tr('pageNumber', {pageNumber: index})}} </span>
      </section>
    </div>
  </div>

</template>


<script>

  import PDFJSLib from 'pdfjs-dist';
  import ScreenFull from 'screenfull';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  import progressBar from 'kolibri.coreVue.components.progressBar';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { sessionTimeSpent } from 'kolibri.coreVue.vuex.getters';
  import { debounce } from 'lodash';

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

  export default {
    name: 'documentPDFRender',
    mixins: [responsiveWindow, responsiveElement],
    components: {
      iconButton,
      progressBar,
      uiIconButton,
    },
    props: ['defaultFile'],
    data: () => ({
      supportsPDFs: true,
      isFullscreen: false,
      progress: 0,
      scale: null,
      timeout: null,
      totalPages: null,
      pageHeight: null,
      pageWidth: null,
    }),
    computed: {
      fullscreenAllowed() {
        return ScreenFull.enabled;
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
    methods: {
      toggleFullscreen() {
        if (this.fullscreenAllowed) {
          ScreenFull.toggle(this.$refs.docViewer);
        } else {
          this.isFullscreen = !this.isFullscreen;
        }
      },
      zoomIn() {
        this.scale += 0.1;
      },
      zoomOut() {
        this.scale -= 0.1;
      },
      getPage(pageNum) {
        return this.pdfDocument.getPage(pageNum);
      },
      startRender(pdfPage) {
        // use a promise because this also calls render, allowing us to cancel
        return new Promise((resolve, reject) => {
          const pageNum = pdfPage.pageNumber;

          // start the loading message
          if (this.currentPageNum === pageNum) {
            this.currentPageRendering = true;
          }

          if (this.pdfPages[pageNum]) {
            this.pdfPages[pageNum].pdfPage = pdfPage;

            // Get viewport, which contains directions to be passed into render function
            const viewport = pdfPage.getViewport(this.scale);

            // create the canvas element where page will be rendered
            // we do this dynamically to avoid having many canvas elements simultaneously in the page
            const canvas = this.pdfPages[pageNum].canvas || document.createElement('canvas');

            // define canvas and dummy blank page dimensions
            canvas.width = this.pageWidth = viewport.width;
            canvas.height = this.pageHeight = viewport.height;
            canvas.style.position = 'absolute';
            canvas.style.top = 0;
            canvas.style.left = 0;

            const renderTask = pdfPage.render({
              canvasContext: canvas.getContext('2d'),
              viewport,
            });

            // Keep track of the canvas in case we need to manipulate it later
            this.pdfPages[pageNum].canvas = canvas;
            this.pdfPages[pageNum].renderTask = renderTask;
            this.pdfPages[pageNum].rendering = true;
            this.pdfPages[pageNum].loading = false;

            // resolves here to indicate that the page has been set up for render.
            // check flags for the stages of the render
            resolve();

            renderTask.then(
              () => {
                // If this has been removed since the rendering started, then we should not proceed
                if (this.pdfPages[pageNum]) {
                  if (this.pdfPages[pageNum].canvas) {
                    // Canvas has not been deleted in the interim
                    this.pdfPages[pageNum].rendered = true;
                    this.$refs[this.pageRef(pageNum)][0].appendChild(this.pdfPages[pageNum].canvas);

                    // end the loading message
                    if (this.currentPageNum === pageNum) {
                      this.currentPageRendering = false;
                    }
                  }
                  // Rendering has completed
                  this.pdfPages[pageNum].rendering = false;
                }
              },
              // If the render task is cancelled, then it will reject the promise and end up here.
              () => {
                if (this.pdfPages[pageNum]) {
                  this.pdfPages[pageNum].rendering = false;
                }
              }
            );
          }
        });
      },
      showPage(pageNum) {
        if (pageNum <= this.totalPages && pageNum > 0) {
          // Only try to show pages that exist
          if (!this.pdfPages[pageNum]) {
            this.pdfPages[pageNum] = {};
          }
          if (
            // Do not try to show the page if it is already renderered,
            // already loading, or already rendering.
            !this.pdfPages[pageNum].rendered &&
            !this.pdfPages[pageNum].loading &&
            !this.pdfPages[pageNum].rendering
          ) {
            this.pdfPages[pageNum].loading = true;
            // If we already have a reference to the PDFJS page object, then use it,
            // rather than refetching it.
            if (!this.pdfPages[pageNum].pdfPage) {
              this.pdfPages[pageNum].renderPromise = this.getPage(pageNum).then(this.startRender);
            } else {
              this.pdfPages[pageNum].renderPromise = this.startRender(this.pdfPages[pageNum].pdfPage);
            }
          }
        }
      },
      hidePage(pageNum) {
        if (pageNum <= this.totalPages && pageNum > 0) {
          // Only try to hide possibly existing pages.
          if (!this.pdfPages[pageNum]) {
            // No page to render, so do nothing
            return;
          }
          const pdfPage = this.pdfPages[pageNum];
          if (pdfPage.rendered) {
            pdfPage.rendered = false;
            // Already rendered, just remove canvas from DOM.
            if (pdfPage.canvas) {
              pdfPage.canvas.remove();
            }
          } else if (pdfPage.loading) {
            // Otherwise, currently loading - let it finish the render promise,
            // where the page is still being fetched
            // then cancel the resulting renderTask.
            const renderTask = pdfPage.renderTask;
            pdfPage.renderPromise.then(() => {
              renderTask && renderTask.cancel();
            });
          } else if (pdfPage.rendering) {
            // Currently rendering, cancel the task directly
            pdfPage.renderTask && pdfPage.renderTask.cancel();
          }
          // Clean everything up (destroys the pdf page object).
          pdfPage.pdfPage && pdfPage.pdfPage.cleanup();
          // Delete the reference so that this page is now a blank slate.
          delete this.pdfPages[pageNum];
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
        const topPageNum = Math.ceil(top / this.pageHeight);
        const bottomPageNum = Math.ceil(bottom / this.pageHeight);

        // Loop through all pages, show ones that are in the display window, hide ones that aren't
        for (let i = 1; i <= this.totalPages; i++) {
          // Hide pages that are less than 'pageDisplayWindow' lower than the top page number
          // or the same amount higher than the bottom page number
          if (i < topPageNum - pageDisplayWindow || i > bottomPageNum + pageDisplayWindow) {
            this.hidePage(i);
          } else {
            this.showPage(i);
          }
        }
      }, renderDebounceTime),
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
        this.pdfPages = {};

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
          this.pdfPages[1] = firstPage;
        });
      });
    },
    mounted() {
      // Retrieve the document and its corresponding object
      this.prepComponentData.then(() => {
        this.$emit('startTracking');
        this.checkPages();
      });

      // progress tracking
      const self = this;
      this.timeout = setTimeout(() => {
        self.$emit('updateProgress', self.sessionTimeSpent / self.targetTime);
      }, 30000);
    },
    beforeDestroy() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.pdfDocument.cleanup();
      this.pdfDocument.destroy();
      this.$emit('stopTracking');
    },
    $trNameSpace: 'pdfRenderer',
    $trs: {
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
      pageNumber: '{pageNumber, number}',
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

  .pdf-page
    &-container
      background: #FFFFFF
      margin: $page-padding auto
      position: relative
      z-index: 2 // material spec - card (resting)
    &-loading
      position: absolute
      top: 50%
      left: 50%
      transform: translate(-50%, -50%)
      font-size: 2em
      line-height: 100%

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
