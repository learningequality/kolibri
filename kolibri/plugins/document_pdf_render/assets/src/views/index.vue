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
      <section class="page-container" v-for="index in totalPages"
        :ref="pageRef(index)"
        :style="{ height: pageHeight + 'px', width: pageWidth + 'px' }">
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

  PDFJSLib.PDFJS.workerSrc = `${__publicPath}pdfJSWorker-${__version}.js`;

  // Number of pages before and after current visible to keep rendered
  const pageDisplayWindow = 1;
  const renderDebounceTime = 500;
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
      scale: null,
      timeout: null,
      isFullscreen: false,
      error: false,
      progress: 0,
      totalPages: 0,
      pageHeight: 0,
      pageWidth: 0,
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
        this.setupInitialPageScale();
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
      // get the page dimensions. By default, uses the first page
      setupInitialPageScale() {
        const pageMargin = 5;
        this.getPage(1).then(
          firstPage => {
            const pdfPageWidth = firstPage.view[2];
            const isDesktop = this.windowSize.breakpoint >= 5;

            if (isDesktop) {
              this.scale = 1;
            } else {
              this.scale = (this.elSize.width - 2 * pageMargin) / pdfPageWidth;
            }
          },
          error => {
            this.error = true;
          }
        );
      },
      startRender(pdfPage) {
        // use a promise because this also calls render, allowing us to cancel
        return new Promise((resolve, reject) => {
          const pageNum = pdfPage.pageNumber;

          if (this.pdfPages[pageNum]) {
            this.pdfPages[pageNum].pdfPage = pdfPage;

            // Get viewport, which contains directions to be passed into render function
            const viewport = pdfPage.getViewport(this.scale);

            // put together the canvas element where page will be rendered
            const canvas = document.createElement('canvas');

            // define canvas and dummy blank page dimensions
            canvas.width = this.pageWidth = viewport.width;
            canvas.height = this.pageHeight = viewport.height;

            const renderTask = pdfPage.render({
              canvasContext: canvas.getContext('2d'),
              viewport,
            });

            this.pdfPages[pageNum].canvas = canvas;
            this.pdfPages[pageNum].renderTask = renderTask;
            this.pdfPages[pageNum].rendering = true;
            this.pdfPages[pageNum].loading = false;

            // resolves here to indicate that the page has been set up for render.
            // check flags for the stages of the render
            resolve();

            renderTask.then(
              () => {
                if (this.pdfPages[pageNum]) {
                  this.pdfPages[pageNum].rendering = false;
                  if (this.pdfPages[pageNum].canvas) {
                    // Canvas has not been deleted in the interim
                    this.pdfPages[pageNum].rendered = true;
                    this.$refs[this.pageRef(pageNum)][0].appendChild(this.pdfPages[pageNum].canvas);
                  }
                }
              },
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
          if (!this.pdfPages[pageNum]) {
            this.pdfPages[pageNum] = {};
          }
          if (
            !this.pdfPages[pageNum].rendered &&
            !this.pdfPages[pageNum].loading &&
            !this.pdfPages[pageNum].rendering
          ) {
            this.pdfPages[pageNum].loading = true;
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
          if (!this.pdfPages[pageNum]) {
            // No page rendered, so do nothing
            return;
          }
          const pdfPage = this.pdfPages[pageNum];
          if (pdfPage.rendered) {
            pdfPage.rendered = false;
            if (pdfPage.canvas) {
              pdfPage.canvas.remove();
            }
          } else if (pdfPage.loading) {
            // Currently loading, cancel the task
            const renderTask = pdfPage.renderTask;
            pdfPage.renderPromise.then(() => {
              renderTask && renderTask.cancel();
            });
          } else if (pdfPage.rendering) {
            // Currently rendering, cancel the task
            pdfPage.renderTask && pdfPage.renderTask.cancel();
          }
          pdfPage.pdfPage && pdfPage.pdfPage.cleanup();
          delete this.pdfPages[pageNum];
        }
      },
      pageRef(index) {
        return `pdfPage-${index}`;
      },
      // debouncing so we're not de/re-render many pages unnecessarily
      checkPages: debounce(function() {
        const top = this.$refs.pdfContainer.scrollTop;
        const bottom = top + this.$refs.pdfContainer.clientHeight;
        const topPageNum = Math.ceil(top / this.pageHeight);
        const bottomPageNum = Math.ceil(bottom / this.pageHeight);

        // Loop through all pages, show ones that are in the display window, hide ones that aren't
        for (let i = 1; i <= this.totalPages; i++) {
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
        const noChange = newScale === oldScale;
        const firstChange = oldScale === null;
        if (!noChange && !firstChange) {
          Object.keys(this.pdfPages).forEach(pageNum => {
            // toggle between hide and show to re-render the page
            this.hidePage(Number(pageNum));
            this.showPage(Number(pageNum));
          });
          this.checkPages();
        }
        this.checkPages();
      },
    },
    created() {
      if (this.fullscreenAllowed) {
        ScreenFull.onchange(() => {
          this.isFullscreen = ScreenFull.isFullscreen;
        });
      }

      this.loadPdfPromise = PDFJSLib.getDocument(this.defaultFile.storage_url);

      // pass callback to update loading bar
      this.loadPdfPromise.onProgress = loadingProgress => {
        this.progress = loadingProgress.loaded / loadingProgress.total;
      };

      this.loadPdfPromise.then(pdfDocument => {
        if (PDFJSLib.FormatError) {
          this.error = true;
          return;
        }

        this.pdfDocument = pdfDocument;
        this.totalPages = pdfDocument.numPages;
        this.pdfPages = {};

        this.setupInitialPageScale();
      });
    },
    mounted() {
      // Retrieve the document and its corresponding object
      this.$emit('startTracking');
      this.checkPages();

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

  .page-container
    background: #FFFFFF
    margin: $page-padding auto

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
