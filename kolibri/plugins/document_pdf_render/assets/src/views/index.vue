<template>

  <div
    ref="container"
    class="container"
    :class="{ 'container-mimic-fullscreen': mimicFullscreen }">
    <icon-button
      class="btn"
      v-if="supportsPDFs"
      :text="isFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      @click="toggleFullscreen"
      :primary="true">
      <mat-svg v-if="isFullscreen" class="icon" category="navigation" name="fullscreen_exit"/>
      <mat-svg v-else class="icon" category="navigation" name="fullscreen"/>
    </icon-button>
    <div ref="pdfcontainer" class="pdfcontainer" @scroll="checkPages">
      <progress-bar v-if="documentLoading" class="progress-bar" :show-percentage="true" :progress="progress"/>
      <p class="page-container" v-for="index in totalPages"
        :ref="pageRef(index)"
        :style="{ height: pageHeight + 'px', width: pageWidth + 'px' }">
      </p>
    </div>
  </div>

</template>


<script>

  import PDFJSLib from 'pdfjs-dist';
  import ScreenFull from 'screenfull';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  import progressBar from 'kolibri.coreVue.components.progressBar';
  import { sessionTimeSpent } from 'kolibri.coreVue.vuex.getters';

  PDFJSLib.PDFJS.workerSrc = `${__publicPath}pdfJSWorker-${__version}.js`;

  // Number of pages before and after current visible to keep rendered
  const pageDisplayWindow = 1;

  export default {
    name: 'documentPDFRender',
    components: {
      iconButton,
      progressBar,
    },
    props: ['defaultFile'],
    data: () => ({
      supportsPDFs: true,
      timeout: null,
      isFullscreen: false,
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
      targetTime() {
        return this.totalPages * 30;
      },
      documentLoading() {
        return this.progress !== 1;
      },
    },
    methods: {
      toggleFullscreen() {
        if (this.isFullscreen) {
          if (this.fullscreenAllowed) {
            ScreenFull.toggle(this.$refs.container);
          }
          this.isFullscreen = false;
        } else {
          if (this.fullscreenAllowed) {
            ScreenFull.toggle(this.$refs.container);
          }
          this.isFullscreen = true;
        }
      },
      getPage(pageNum) {
        return this.pdfDocument.getPage(pageNum);
      },
      getPageViewport(pdfPage) {
        return new Promise((resolve, reject) => {
          const pageNum = pdfPage.pageNumber;
          if (this.pdfPages[pageNum]) {
            // Display page on the existing canvas with 100% scale.
            const viewport = pdfPage.getViewport(1.0);
            this.pdfPages[pageNum].pdfPage = pdfPage;

            // put together the canvas elment where page will be rendered
            const canvas = document.createElement('canvas');
            if (this.pageHeight === 0 && this.pageWidth === 0) {
              this.pageHeight = viewport.height;
              this.pageWidth = viewport.width;
            }
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // specify the rules for render and create the necessary task
            const ctx = canvas.getContext('2d');
            const renderTask = pdfPage.render({
              canvasContext: ctx,
              viewport: viewport,
            });
            this.pdfPages[pageNum].canvas = canvas;
            this.pdfPages[pageNum].renderTask = renderTask;
            this.pdfPages[pageNum].rendering = true;
            this.pdfPages[pageNum].loading = false;
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
              this.pdfPages[pageNum].viewportPromise = this.getPage(pageNum).then(
                this.getPageViewport
              );
            } else {
              this.pdfPages[pageNum].viewportPromise = this.getPageViewport(
                this.pdfPages[pageNum].pdfPage
              );
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
            pdfPage.viewportPromise.then(() => {
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
      checkPages() {
        const top = this.$refs.pdfcontainer.scrollTop;
        const bottom = top + this.$refs.pdfcontainer.clientHeight;
        const topPageNum = Math.ceil(top / this.pageHeight);
        const bottomPageNum = Math.ceil(bottom / this.pageHeight);
        let i;
        // Loop through all pages, show ones that are in the display window,
        // hide ones that are not
        for (i = 1; i <= this.totalPages; i++) {
          if (i < topPageNum - pageDisplayWindow || i > bottomPageNum + pageDisplayWindow) {
            this.hidePage(i);
          } else {
            this.showPage(i);
          }
        }
      },
    },
    watch: {
      scrollPos: 'checkPages',
    },
    created() {
      this.pdfPages = {};
      this.pdfloadingPromise = PDFJSLib.getDocument(
        this.defaultFile.storage_url,
        null,
        null,
        progress => {
          this.progress = progress.loaded / progress.total;
        }
      ).then(pdfDocument => {
        this.totalPages = pdfDocument.numPages;
        // Track the pdf document
        this.pdfDocument = pdfDocument;
        // Begin retrieving the first page
        return this.getPage(1);
      });
    },
    mounted() {
      this.pdfloadingPromise.then(() => {
        this.showPage(1);
        this.$emit('startTracking');
      });
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

  .btn
    position: absolute
    left: 50%
    transform: translateX(-50%)

  .progress-bar
    top: 50%
    margin: 0 auto
    max-width: 200px

  .container
    position: relative
    height: 100vh
    max-height: calc(100vh - 24em)
    min-height: 400px
    &:fullscreen
      width: 100%
      height: 100%
      min-height: inherit
      max-height: inherit

  .container-mimic-fullscreen
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

  .pdfcontainer
    height: 100%
    overflow-y: scroll
    text-align: center

  .page-container
    background: #FFFFFF
    margin: 5px auto

</style>
