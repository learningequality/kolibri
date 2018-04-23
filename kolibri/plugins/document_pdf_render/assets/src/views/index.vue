<template>

  <div
    ref="pdfRenderer"
    class="pdf-renderer"
    :class="{ 'mimic-fullscreen': mimicFullscreen }"
    allowfullscreen
  >

    <template v-if="!documentLoading">
      <ui-icon-button
        class="controls button-fullscreen"
        aria-controls="pdf-container"
        :ariaLabel="isFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
        :icon="isFullscreen ? 'fullscreen_exit' : 'fullscreen'"
        size="large"
        @click="toggleFullscreen"
      />

      <ui-icon-button
        class="controls button-zoom-in"
        aria-controls="pdf-container"
        icon="add"
        size="large"
        @click="zoomIn"
      />
      <ui-icon-button
        class="controls button-zoom-out"
        aria-controls="pdf-container"
        icon="remove"
        size="large"
        @click="zoomOut"
      />
    </template>

    <div class="pdf-container">
      <k-linear-loader
        v-if="documentLoading"
        class="progress-bar"
        :delay="false"
        :type="progress > 0 ? 'determinate' : 'indeterminate'"
        :progress="progress * 100"
      />
      <recycle-list
        v-else
        :style="recycleListStyle"
        ref="recycleList"
        :items="pdfPages"
        :itemHeight="pageHeight + 16"
        :emitUpdate="true"
        keyField="index"
        @update="handleScroll"
      >
        <template slot-scope="{ item }">
          <pdf-page
            :pdfPage="item.page"
            :key="item.index"
            :pageNum="item.index + 1"
            :pageReady="item.resolved"
            :scale="scale"
            :defaultHeight="pageHeight"
            :defaultWidth="pageWidth"
          />
        </template>
      </recycle-list>

    </div>
  </div>

</template>


<script>

  import PDFJSLib from 'pdfjs-dist';
  import ScreenFull from 'screenfull';
  import Lockr from 'lockr';

  import throttle from 'lodash/throttle';
  import debounce from 'lodash/debounce';

  import { RecycleList } from 'vue-virtual-scroller';
  import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

  import kButton from 'kolibri.coreVue.components.kButton';
  import kLinearLoader from 'kolibri.coreVue.components.kLinearLoader';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRenderer';
  import { sessionTimeSpent } from 'kolibri.coreVue.vuex.getters';

  import uiIconButton from 'keen-ui/src/UiIconButton';

  import pdfPage from './pdfPage';
  // Source from which PDFJS loads its service worker, this is based on the __publicPath
  // global that is defined in the Kolibri webpack pipeline, and the additional entry in the PDF
  // renderer's own webpack config
  PDFJSLib.PDFJS.workerSrc = `${__publicPath}pdfJSWorker-${__version}.js`;

  // How often should we respond to changes in scrolling to render new pages?
  const renderDebounceTime = 300;

  const scaleIncrement = 0.25;

  export default {
    name: 'pdfRender',
    components: {
      kButton,
      kLinearLoader,
      uiIconButton,
      pdfPage,
      RecycleList,
    },
    mixins: [responsiveWindow, responsiveElement, contentRendererMixin],
    data: () => ({
      isFullscreen: false,
      progress: null,
      scale: null,
      timeout: null,
      totalPages: null,
      pageHeight: null,
      pageWidth: null,
      firstPageHeight: null,
      firstPageWidth: null,
      pdfPages: [],
      recycleListMounted: false,
      firstScroll: true,
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
      targetTime() {
        return this.totalPages * 30;
      },
      documentLoading() {
        return this.progress !== 1;
      },
      pdfPositionKey() {
        return `pdfPosition-${this.files[0].id}`;
      },
      height() {
        return this.elSize.height;
      },
      recycleListStyle() {
        if (this.isFullscreen) {
          return { ...this.containerStyle, height: '100vh' };
        }
        return this.containerStyle;
      },
    },
    watch: {
      scale(newScale, oldScale) {
        // Listen to changes in scale, as we have to rerender every visible page if it changes.
        const noChange = newScale === oldScale;
        const firstChange = oldScale === null;
        if (!noChange && !firstChange) {
          // get current pos
          const relativePos = this.calculateRelativePosition();
          this.pageHeight = this.firstPageHeight * newScale;
          this.pageWidth = this.firstPageWidth * newScale;
          this.$nextTick()
            .then(() => {
              this.forceUpdateRecycleList();
            })
            .then(() => {
              this.scrollTo(relativePos);
            });
        }
      },
      height: 'updatePosition',
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

        // init pdfPages array
        for (let i = 0; i < this.totalPages; i++) {
          this.pdfPages.push({
            page: null,
            resolved: false,
            index: i,
          });
        }

        return this.getPage(1).then(firstPage => {
          const pageMargin = 8;
          this.firstPageWidth = firstPage.view[2];
          this.firstPageHeight = firstPage.view[3];

          this.scale =
            this.windowSize.breakpoint > 3
              ? 1
              : (this.elSize.width - 2 * pageMargin) / this.firstPageWidth;

          // set default height and width properties
          const initialViewport = firstPage.getViewport(this.scale);
          this.pageHeight = initialViewport.height;
          this.pageWidth = initialViewport.width;
          // Set the firstPage into the pdfPages object so that we do not refetch the page
          // from PDFJS when we do our initial render
          // splice so changes are detected
          this.pdfPages.splice(0, 1, {
            page: firstPage,
            resolved: true,
            index: 0,
          });
        });
      });
    },
    mounted() {
      // Retrieve the document and its corresponding object
      this.prepComponentData.then(() => {
        this.progress = 1;
        this.updatePosition();
        this.$emit('startTracking');
        // Automatically master after the targetTime, convert seconds -> milliseconds
        this.timeout = setTimeout(this.updateProgress, this.targetTime * 1000);
      });
    },
    beforeDestroy() {
      this.updateProgress();

      if (this.timeout) {
        clearTimeout(this.timeout);
      }

      if (this.pdfDocument) {
        this.pdfDocument.cleanup();
        this.pdfDocument.destroy();
      }

      this.$emit('stopTracking');
    },
    methods: {
      getPage(pageNum) {
        return this.pdfDocument.getPage(pageNum);
      },
      showPage(pageNum) {
        // Only bother getting it if the pdfPage object is not already cached in the array
        if (pageNum > 0 && pageNum <= this.totalPages && !this.pdfPages[pageNum - 1].resolved) {
          const pageIndex = pageNum - 1;
          this.getPage(pageNum).then(pdfPage => {
            // splice so changes are detected
            this.pdfPages.splice(pageIndex, 1, {
              page: pdfPage,
              resolved: true,
              index: pageIndex,
            });
          });
        }
      },
      handleScroll: debounce(function(start, end) {
        this.recycleListMounted = true;
        const startIndex = Math.floor(start) + 1;
        const endIndex = Math.ceil(end) + 1;
        for (let i = startIndex; i <= endIndex; i++) {
          this.showPage(i);
        }

        // update progress after we determine which pages to render
        this.updateProgress();

        // Save position in local storage but skip first update event which sets the position to 0
        if (this.progress === 1 && !this.firstScroll) {
          Lockr.set(this.pdfPositionKey, this.calculateRelativePosition());
        }
        if (this.firstScroll) {
          this.updatePosition();
          this.firstScroll = false;
        }
      }, renderDebounceTime),
      zoomIn: throttle(function() {
        // limit zoom in
        this.scale = Math.min(scaleIncrement * 15, this.scale + scaleIncrement);
      }, renderDebounceTime),
      zoomOut: throttle(function() {
        this.scale = Math.max(scaleIncrement, this.scale - scaleIncrement);
      }, renderDebounceTime),
      calculateRelativePosition() {
        return this.$refs.recycleList.$el.scrollTop / this.$refs.recycleList.$el.scrollHeight;
      },
      updatePosition() {
        if (this.recycleListMounted) {
          this.forceUpdateRecycleList();
          this.$nextTick().then(() => {
            this.scrollTo(Lockr.get(this.pdfPositionKey));
          });
        }
      },
      scrollTo(relativePosition) {
        this.$refs.recycleList.$el.scrollTop =
          this.$refs.recycleList.$el.scrollHeight * relativePosition;
      },
      forceUpdateRecycleList: debounce(function() {
        this.$refs.recycleList.updateVisibleItems({ checkItem: false });
      }, renderDebounceTime),
      updateProgress() {
        this.$emit('updateProgress', this.sessionTimeSpent / this.targetTime);
      },
      toggleFullscreen() {
        if (this.fullscreenAllowed) {
          ScreenFull.toggle(this.$refs.pdfRenderer);
        } else {
          this.isFullscreen = !this.isFullscreen;
        }
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

  .pdf-renderer
    position: relative

  .pdf-renderer:fullscreen
    width: 100%
    height: 100%
    min-height: inherit
    max-height: inherit

  .mimic-fullscreen
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

  .controls
    position: absolute

  .pdf-container
    text-align: center
    background-color: $core-text-default

  .controls
    z-index: 6 // material spec - snackbar and FAB

  .button-fullscreen, .button-zoom-in, .button-zoom-out
    right: 32px

  .button-fullscreen
    top: 16px

  .button-zoom-in
    top: $keen-button-height + 32

  .button-zoom-out
    top: ($keen-button-height * 2) + 48

  .progress-bar
    top: 50%
    margin: 0 auto
    max-width: 200px

</style>
