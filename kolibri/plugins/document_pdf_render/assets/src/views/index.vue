<template>

  <fullscreen
    ref="pdfRenderer"
    class="pdf-renderer"
    @changeFullscreen="isInFullscreen = $event"
  >
    <k-linear-loader
      v-if="documentLoading || firstPageHeight === null"
      class="progress-bar"
      :delay="false"
      :type="progress > 0 ? 'determinate' : 'indeterminate'"
      :progress="progress * 100"
    />

    <template v-else>
      <recycle-list
        ref="recycleList"
        :items="pdfPages"
        :itemHeight="itemHeight"
        :emitUpdate="true"
        :style="{ height: `${elSize.height}px` }"
        class="pdf-container"
        keyField="index"
        @update="handleUpdate"
      >
        <template slot-scope="{ item }">
          <pdf-page
            :key="item.index"
            :pageNum="item.index + 1"
            :pdfPage="pdfPages[item.index].page"
            :pageReady="pdfPages[item.index].resolved"
            :firstPageHeight="firstPageHeight || 0"
            :firstPageWidth="firstPageWidth || 0"
            :scale="scale || 1"
          />
        </template>
      </recycle-list>

      <ui-icon-button
        class="controls button-fullscreen"
        aria-controls="pdf-container"
        :ariaLabel="isInFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
        color="primary"
        size="large"
        @click="$refs.pdfRenderer.toggleFullscreen()"
      >
        <mat-svg v-if="isInFullscreen" name="fullscreen_exit" category="navigation" />
        <mat-svg v-else name="fullscreen" category="navigation" />
      </ui-icon-button>
      <ui-icon-button
        class="controls button-zoom-in"
        aria-controls="pdf-container"
        @click="zoomIn"
      >
        <mat-svg name="add" category="content" />
      </ui-icon-button>
      <ui-icon-button
        class="controls button-zoom-out"
        aria-controls="pdf-container"
        @click="zoomOut"
      >
        <mat-svg name="remove" category="content" />
      </ui-icon-button>
    </template>
  </fullscreen>

</template>


<script>

  import PDFJSLib from 'pdfjs-dist';
  import Lockr from 'lockr';

  import throttle from 'lodash/throttle';
  import debounce from 'lodash/debounce';

  import { RecycleList } from 'vue-virtual-scroller';
  import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
  // polyfill necessary for recycle list
  import 'intersection-observer';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kLinearLoader from 'kolibri.coreVue.components.kLinearLoader';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRenderer';
  import { sessionTimeSpent } from 'kolibri.coreVue.vuex.getters';
  import fullscreen from 'kolibri.coreVue.components.fullscreen';

  import uiIconButton from 'keen-ui/src/UiIconButton';

  import pdfPage from './pdfPage';
  // Source from which PDFJS loads its service worker, this is based on the __publicPath
  // global that is defined in the Kolibri webpack pipeline, and the additional entry in the PDF
  // renderer's own webpack config
  PDFJSLib.PDFJS.workerSrc = `${__publicPath}pdfJSWorker-${__version}.js`;

  // How often should we respond to changes in scrolling to render new pages?
  const renderDebounceTime = 300;
  const scaleIncrement = 0.25;
  const MARGIN = 16;

  export default {
    name: 'pdfRender',
    components: {
      kButton,
      kLinearLoader,
      uiIconButton,
      pdfPage,
      RecycleList,
      fullscreen,
    },
    mixins: [responsiveWindow, responsiveElement, contentRendererMixin],
    data: () => ({
      progress: null,
      scale: null,
      timeout: null,
      totalPages: null,
      firstPageHeight: null,
      firstPageWidth: null,
      pdfPages: [],
      recycleListIsMounted: false,
      isInFullscreen: false,
    }),
    computed: {
      pdfURL() {
        return this.defaultFile.storage_url;
      },
      targetTime() {
        return this.totalPages * 30;
      },
      documentLoading() {
        return this.progress < 1;
      },
      pdfPositionKey() {
        return `pdfPosition-${this.files[0].id}`;
      },
      height() {
        return this.elSize.height;
      },
      itemHeight() {
        return this.firstPageHeight * this.scale + MARGIN;
      },
    },
    watch: {
      scale(newScale, oldScale) {
        // Listen to changes in scale, as we have to rerender every visible page if it changes.
        const noChange = newScale === oldScale;
        const firstChange = oldScale === null;
        if (!noChange && !firstChange) {
          this.$nextTick(() => {
            this.forceUpdateRecycleList();
          });
        }
      },
      height() {
        if (this.recycleListIsMounted) {
          this.debounceForceUpdateRecycleList();
        }
      },
    },
    created() {
      const loadPdfPromise = PDFJSLib.getDocument(this.defaultFile.storage_url);

      // pass callback to update loading bar
      loadPdfPromise.onProgress = loadingProgress => {
        this.progress = loadingProgress.loaded / loadingProgress.total;
      };

      this.prepComponentData = loadPdfPromise.then(pdfDocument => {
        // Get initial info from the loaded pdf document
        this.pdfDocument = pdfDocument;
        this.totalPages = this.pdfDocument.numPages;

        // init pdfPages array
        for (let i = 0; i < this.totalPages; i++) {
          this.pdfPages.push({
            page: null,
            resolved: false,
            index: i,
          });
        }
        // Is either the first page or the saved last page visited
        const firstPageToRender = parseInt(this.getSavedPosition() * this.totalPages);
        return this.getPage(firstPageToRender + 1).then(firstPage => {
          this.firstPageHeight = firstPage.view[3];
          this.firstPageWidth = firstPage.view[2];
          this.scale = this.elSize.width / (this.firstPageWidth + MARGIN);
          // Set the firstPageToRender into the pdfPages object so that we do not refetch the page
          // from PDFJS when we do our initial render
          // splice so changes are detected
          this.pdfPages.splice(firstPageToRender, 1, {
            ...this.pdfPages[firstPageToRender],
            page: firstPage,
            resolved: true,
          });
        });
      });
    },
    mounted() {
      // Retrieve the document and its corresponding object
      this.prepComponentData.then(() => {
        // Progress is NaN if loadingProgress.total is undefined
        if (isNaN(this.progress)) {
          this.progress = 1;
        }
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
              ...this.pdfPages[pageIndex],
              page: pdfPage,
              resolved: true,
            });
          });
        }
      },
      // handle the recycle list update event
      handleUpdate: debounce(function(start, end) {
        // check that it is mounted
        if (!this.$refs.recycleList || !this.$refs.recycleList.$el) {
          return;
        }
        // check if this is the first update event
        if (!this.recycleListIsMounted) {
          this.recycleListIsMounted = true;
          // save height
          this.recycleListHeight = this.calculateRecycleListHeight();
          // scroll to saved position
          this.scrollTo(this.getSavedPosition());
          return;
        }

        // check if height has changed indicating a change in scale
        // in that case we need to scroll to correct place that is saved
        const currentRecycleListHeight = this.calculateRecycleListHeight();
        if (this.recycleListHeight !== currentRecycleListHeight) {
          this.recycleListHeight = currentRecycleListHeight;
          this.scrollTo(this.getSavedPosition());
        } else {
          // TODO: there is a miscalculation that causes a wrong position change on scale
          this.savePosition(this.calculatePosition());
          // update progress after we determine which pages to render
          this.updateProgress();
        }
        const startIndex = Math.floor(start) + 1;
        const endIndex = Math.ceil(end) + 1;
        for (let i = startIndex; i <= endIndex; i++) {
          this.showPage(i);
        }
      }, renderDebounceTime),

      zoomIn() {
        this.setScale(Math.min(scaleIncrement * 20, this.scale + scaleIncrement));
      },
      zoomOut() {
        this.setScale(Math.max(scaleIncrement / 2, this.scale - scaleIncrement));
      },
      setScale: throttle(function(scaleValue) {
        this.scale = scaleValue;
      }, 500),
      calculatePosition() {
        return this.$refs.recycleList.$el.scrollTop / this.$refs.recycleList.$el.scrollHeight;
      },
      savePosition(val) {
        Lockr.set(this.pdfPositionKey, val);
      },
      getSavedPosition() {
        return Lockr.get(this.pdfPositionKey) || 0;
      },
      scrollTo(relativePosition) {
        this.$refs.recycleList.$el.scrollTop =
          this.$refs.recycleList.$el.scrollHeight * relativePosition;
      },
      calculateRecycleListHeight() {
        return this.$refs.recycleList.$el.scrollHeight;
      },
      debounceForceUpdateRecycleList: debounce(function() {
        this.forceUpdateRecycleList();
      }, renderDebounceTime),
      forceUpdateRecycleList() {
        this.$refs.recycleList.updateVisibleItems(false);
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

  .pdf-renderer
    position: relative
    height: 500px
    background-color: $core-text-default

  .controls
    position: absolute
    z-index: 6 // material spec - snackbar and FAB

  .button-fullscreen
    top: 16px
    right: 21px
    fill: white

  .button-zoom-in,
  .button-zoom-out
    right: 27px

  .button-zoom-in
    top: 80px

  .button-zoom-out
    top: 132px

  .progress-bar
    top: 50%
    margin: 0 auto
    max-width: 200px

  // enable horizontal scrolling
  >>>.recycle-list
    .item-wrapper
      overflow-x: auto

</style>
