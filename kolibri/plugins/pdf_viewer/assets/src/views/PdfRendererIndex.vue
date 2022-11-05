<template>

  <CoreFullscreen
    ref="pdfRenderer"
    class="pdf-renderer"
    :class="{ 'pdf-controls-open': showControls }"
    :style="{ backgroundColor: $themeTokens.text }"
    @changeFullscreen="isInFullscreen = $event"
  >
    <KLinearLoader
      v-if="documentLoading || firstPageHeight === null"
      class="progress-bar"
      :delay="false"
      :type="progress > 0 ? 'determinate' : 'indeterminate'"
      :progress="progress * 100"
    />

    <template v-else>
      <transition name="slide">
        <div
          v-if="showControls"
          class="fullscreen-header pdf-controls-container"
          :style="{ backgroundColor: this.$themePalette.grey.v_100 }"
        >
          <div>
            <KIconButton
              v-if="outline && outline.length > 0"
              class="controls"
              :ariaLabel="coreString('menu')"
              aria-controls="sidebar-container"
              icon="menu"
              @click="toggleSideBar"
            />
          </div>
          <div>
            <KIconButton
              class="button-zoom-in controls"
              :ariaLabel="coreString('zoomIn')"
              aria-controls="pdf-container"
              icon="add"
              @click="zoomIn"
            />
            <KIconButton
              class="button-zoom-out controls"
              :ariaLabel="coreString('zoomOut')"
              aria-controls="pdf-container"
              icon="remove"
              @click="zoomOut"
            />
            <KButton
              class="fullscreen-button"
              :primary="false"
              appearance="flat-button"
              :icon="isInFullscreen ? 'fullscreen_exit' : 'fullscreen'"
              @click="$refs.pdfRenderer.toggleFullscreen()"
            >
              {{ fullscreenText }}
            </KButton>
          </div>
        </div>
      </transition>
      <KGrid gutter="0">
        <KGridItem
          v-if="showSideBar"
          :layout8="{ span: 2 }"
          :layout12="{ span: 3 }"
          class="sidebar-container"
          :class="{ 'mt-40': showControls }"
        >
          <SideBar
            :outline="outline || []"
            :goToDestination="goToDestination"
            :focusDestPage="focusDestPage"
          />
        </KGridItem>
        <KGridItem
          :layout8="{ span: showSideBar ? 6 : 8 }"
          :layout12="{ span: showSideBar ? 9 : 12 }"
        >
          <RecycleList
            ref="recycleList"
            :items="pdfPages"
            :itemHeight="itemHeight"
            :emitUpdate="true"
            :style="{ height: `${elementHeight}px` }"
            class="pdf-container"
            keyField="index"
            @update="handleUpdate"
          >
            <template #default="{ item }">
              <PdfPage
                :key="item.index"
                :pageNum="item.index + 1"
                :pdfPage="pdfPages[item.index].page"
                :pageReady="pdfPages[item.index].resolved"
                :firstPageHeight="firstPageHeight || 0"
                :firstPageWidth="firstPageWidth || 0"
                :scale="scale || 1"
                :totalPages="pdfPages.length"
                :eventBus="eventBus"
              />
            </template>
          </RecycleList>
        </KGridItem>
      </KGrid>
    </template>
  </CoreFullscreen>

</template>


<script>

  import * as PDFJSLib from 'pdfjs-dist/legacy/build/pdf';
  import Hammer from 'hammerjs';
  import throttle from 'lodash/throttle';
  import debounce from 'lodash/debounce';
  import { RecycleList } from 'vue-virtual-scroller';
  import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
  // polyfill necessary for recycle list
  import 'intersection-observer';
  import responsiveElementMixin from 'kolibri.coreVue.mixins.responsiveElementMixin';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import { EventBus } from '../utils/event_utils';
  import PdfPage from './PdfPage';
  import SideBar from './SideBar';

  // Source from which PDFJS loads its service worker, this is based on the __publicPath
  // global that is defined in the Kolibri webpack pipeline, and the additional entry in the PDF
  // renderer's own webpack config
  PDFJSLib.GlobalWorkerOptions.workerSrc = __webpack_public_path__ + `pdfJSWorker-${__version}.js`;
  // How often should we respond to changes in scrolling to render new pages?
  const renderDebounceTime = 300;
  const scaleIncrement = 0.25;
  const MARGIN = 16;
  export default {
    name: 'PdfRendererIndex',
    components: {
      SideBar,
      PdfPage,
      RecycleList,
      CoreFullscreen,
    },
    mixins: [responsiveWindowMixin, responsiveElementMixin],
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
      currentLocation: 0,
      updateContentStateInterval: null,
      showControls: true,
      showSideBar: false,
      visitedPages: {},
      eventBus: null,
      outline: null,
    }),
    computed: {
      // Returns whether or not the current device is iOS.
      // Probably not perfect, but worked in testing.
      iOS() {
        const iDevices = [
          'iPad Simulator',
          'iPhone Simulator',
          'iPod Simulator',
          'iPad',
          'iPhone',
          'iPod',
        ];
        return iDevices.includes(navigator.platform);
      },
      documentLoading() {
        return this.progress < 1;
      },
      itemHeight() {
        return this.firstPageHeight * this.scale + MARGIN;
      },
      savedLocation() {
        if (this.extraFields && this.extraFields.contentState) {
          return this.extraFields.contentState.savedLocation;
        }
        return 0;
      },
      savedVisitedPages: {
        get() {
          if (this.extraFields && this.extraFields.contentState) {
            return this.extraFields.contentState.savedVisitedPages || {};
          }
          return {};
        },
        set(value) {
          this.visitedPages = value;
        },
      },
      fullscreenText() {
        return this.isInFullscreen ? this.$tr('exitFullscreen') : this.$tr('enterFullscreen');
      },
      /* eslint-disable kolibri/vue-no-unused-properties */
      /**
       * @public
       */
      defaultDuration() {
        return this.totalPages * 30;
      },
      /* eslint-enable kolibri/vue-no-unused-properties */
    },
    watch: {
      recycleListIsMounted(newVal) {
        // On iOS pinch zooming always targets the document no matter what.
        // meta viewport attrs for `user-scalable` are ignored in iOS because
        // Apple considered it an a11y issue not to. So pinch-zooming on iOS
        // does not work well because - even if you zoom in on the PDF, the whole
        // screen zooms too which is jarring.
        if (newVal === true && !this.iOS) {
          const hammer = Hammer(this.$refs.recycleList.$el);
          hammer.get('pinch').set({ enable: true });
          hammer.on('pinchin', throttle(this.zoomOut, 1000));
          hammer.on('pinchout', throttle(this.zoomIn, 1000));
        }
      },
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
      elementHeight() {
        if (this.recycleListIsMounted) {
          this.debounceForceUpdateRecycleList();
        }
      },
      // Listen to change in scroll position to determine whether we show top control bar or not
      currentLocation(newPos, oldPos) {
        if (newPos > oldPos) {
          this.showControls = false;
        } else {
          this.showControls = true;
        }
      },
    },
    destroyed() {
      // Reset the overflow on the HTML tag that we set to hidden in created()
      window.document.getElementsByTagName('html')[0].style.overflow = 'auto';
    },
    created() {
      // Override, only on this component, the overflow style of the HTML tag
      // so that PDFRenderer can scroll itself.
      window.document.getElementsByTagName('html')[0].style.overflow = 'hidden';

      this.currentLocation = this.savedLocation;
      this.showControls = true; // Ensures it shows on load even if we're scrolled
      const loadingPdf = PDFJSLib.getDocument(this.defaultFile.storage_url);
      // pass callback to update loading bar
      loadingPdf.onProgress = loadingProgress => {
        this.progress = loadingProgress.loaded / loadingProgress.total;
      };
      this.eventBus = new EventBus();
      this.prepComponentData = loadingPdf.promise.then(pdfDocument => {
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
          const screenSizeMultiplier = this.windowIsLarge ? 1.25 : this.windowIsSmall ? 1 : 1.125;
          this.scale = this.elementWidth / (this.firstPageWidth * screenSizeMultiplier);
          // Set the firstPageToRender into the pdfPages object so that we do not refetch the page
          // from PDFJS when we do our initial render
          // splice so changes are detected
          this.pdfPages.splice(firstPageToRender, 1, {
            ...this.pdfPages[firstPageToRender],
            page: firstPage,
            resolved: true,
          });
          pdfDocument.getOutline().then(outline => {
            this.outline = outline;
            this.showSideBar = outline && outline.length > 0; // Remove if other tabs are already implemented
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
        this.updateContentStateInterval = setInterval(this.updateProgress, 30000);
        // Even if user does not pause while scrolling on first page, we store that as visited
        this.storeVisitedPage(1);
      });
    },
    beforeDestroy() {
      this.updateProgress();
      this.updateContentState();
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      if (this.pdfDocument) {
        this.pdfDocument.cleanup();
        this.pdfDocument.destroy();
      }
      this.$emit('stopTracking');
      clearInterval(this.updateContentStateInterval);
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
      storeVisitedPage(currentPageNum) {
        let visited = this.savedVisitedPages;
        visited[currentPageNum] = true;
        this.savedVisitedPages = visited;
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

          // determine how many pages user has viewed/visited; fix edge case of 2 pages
          let currentPage =
            this.totalPages === 2 ? 2 : parseInt(this.currentLocation * this.totalPages) + 1;
          this.storeVisitedPage(currentPage);
          this.updateProgress();
          this.updateContentState();
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
      toggleSideBar() {
        this.showSideBar = !this.showSideBar;
      },
      calculatePosition() {
        return this.$refs.recycleList.$el.scrollTop / this.$refs.recycleList.$el.scrollHeight;
      },
      savePosition(val) {
        this.currentLocation = val;
      },
      getSavedPosition() {
        return this.currentLocation;
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
        if (this.forceDurationBasedProgress) {
          // update progress using total time user has spent on the pdf
          this.$emit('updateProgress', this.durationBasedProgress);
        } else {
          // update progress using number of pages seen out of available pages
          this.$emit(
            'updateProgress',
            Object.keys(this.savedVisitedPages).length / this.totalPages
          );
        }
      },
      updateContentState() {
        let contentState;
        if (this.extraFields) {
          contentState = {
            ...this.extraFields.contentState,
            savedLocation: this.currentLocation || this.savedLocation,
            savedVisitedPages: this.visitedPages || this.savedVisitedPages,
          };
        } else {
          contentState = {
            savedLocation: this.currentLocation || this.savedLocation,
            savedVisitedPages: this.visitedPages || this.savedVisitedPages,
          };
        }
        this.$emit('updateContentState', contentState);
      },
      /**
       * Handle bookmark items click.
       * Adaptation of the original functions from pdf.js:
       * - https://github.com/mozilla/pdf.js/blob/v2.14.305/web/pdf_link_service.js#L237
       * - https://github.com/mozilla/pdf.js/blob/v2.14.305/web/pdf_link_service.js#L176
       * - https://github.com/mozilla/pdf.js/blob/v2.14.305/web/base_viewer.js#L1175
       */
      async goToDestination(dest) {
        if (!this.pdfDocument) {
          return;
        }
        let explicitDest;
        if (typeof dest === 'string') {
          explicitDest = await this.pdfDocument.getDestination(dest);
        } else {
          explicitDest = await dest;
        }
        if (!Array.isArray(explicitDest)) {
          console.error('Error getting destination');
          return;
        }

        const pageNumber = await this.getDestinationPageNumber(explicitDest);
        if (!pageNumber || pageNumber < 1 || pageNumber > this.pagesCount) {
          console.error('Invalid destination page');
          return;
        }

        let position = (pageNumber - 1) / this.totalPages; // relative page position

        // add relative y offset of the destination on the page
        if (explicitDest[1].name === 'XYZ') {
          // XYZ is a dest name value from pdfjs
          const y = this.firstPageHeight - explicitDest[3];
          const relativeYPage = y / this.firstPageHeight;
          // This isnt taking into account the padding between pages
          // but it gives it a good little space
          position += relativeYPage * (1 / this.totalPages);
        }

        this.scrollTo(position);
      },
      async focusDestPage(dest, event) {
        if (!this.pdfDocument) {
          return;
        }
        let explicitDest;
        if (typeof dest === 'string') {
          explicitDest = await this.pdfDocument.getDestination(dest);
        } else {
          explicitDest = await dest;
        }
        if (!Array.isArray(explicitDest)) {
          console.error('Error getting destination');
          return;
        }

        const pageNumber = await this.getDestinationPageNumber(explicitDest);
        if (!pageNumber || pageNumber < 1 || pageNumber > this.pagesCount) {
          console.error('Invalid destination page');
          return;
        }
        const isFocused = this.focusPage(pageNumber, event.target);
        if (!isFocused) {
          let position = (pageNumber - 1) / this.totalPages;
          this.scrollTo(position); // scroll to page so the virtual list can render it
          const onPageRendered = e => {
            if (e.pageNumber === pageNumber) {
              this.focusPage(pageNumber, event.target);
              this.eventBus.off('pageRendered', onPageRendered);
            }
          };
          this.eventBus.on('pageRendered', onPageRendered);
        }
      },
      /**
       * Focus a given pdf page and return true if the page was already rendered
       */
      focusPage(pageNumber, bookmark) {
        const page = document.querySelector('#pdf-page-' + pageNumber);
        if (page) {
          page.setAttribute('tabindex', 0);
          page.focus({
            preventScroll: true,
          });
          const backToBookmark = e => {
            if (e.key === 'Enter' && e.shiftKey) {
              page.removeAttribute('tabindex');
              window.removeEventListener('keydown', backToBookmark);
              bookmark.focus();
            }
          };
          window.addEventListener('keydown', backToBookmark);
          return true;
        }
        return false;
      },
      /**
       * Get the page number from the explicit destination array.
       * Adaptation of the original function from pdf.js:
       * - https://github.com/mozilla/pdf.js/blob/v2.14.305/web/pdf_link_service.js#L181
       */
      async getDestinationPageNumber(explicitDest) {
        try {
          const destRef = explicitDest[0];
          if (typeof destRef === 'object' && destRef !== null) {
            const pageIndex = await this.pdfDocument.getPageIndex(destRef);
            return pageIndex + 1;
          }
          if (Number.isInteger(destRef)) {
            return destRef + 1;
          }
          console.error('Invalid destination reference');
          return null;
        } catch (e) {
          console.error('Error getting destination page number', e);
          return null;
        }
      },
    },
    $trs: {
      exitFullscreen: {
        message: 'Exit fullscreen',
        context:
          "Learners can use the Esc key or the 'exit fullscreen' button to close the fullscreen view on the PDF Viewer.",
      },
      enterFullscreen: {
        message: 'Enter fullscreen',
        context:
          'Learners can use the full screen button in the upper right corner to open a PDF in fullscreen view.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  $controls-height: 40px;
  $top-bar-height: 32px;

  .pdf-renderer {
    @extend %momentum-scroll;
    @extend %dropshadow-2dp;

    position: relative;
    height: calc(100vh - #{$top-bar-height} - #{$controls-height} + 16px);
    overflow-y: hidden;
  }

  .pdf-container {
    position: relative;
    top: $controls-height;
  }

  .controls {
    position: relative;
    z-index: 0; // Hide icons with transition
    margin: 0 4px;
  }

  .pdf-controls-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
  }

  .progress-bar {
    top: 50%;
    max-width: 200px;
    margin: 0 auto;
  }
  // enable horizontal scrolling
  /deep/ .recycle-list {
    .item-wrapper {
      overflow-x: auto;
    }
  }

  .fullscreen-button {
    margin: 0;

    svg {
      position: relative;
      top: 8px;
    }
  }

  .fullscreen-header {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 7;
    display: flex;
    height: $controls-height;
  }

  .slide-enter-active {
    @extend %md-accelerate-func;

    transition: all 0.3s;
  }

  .slide-leave-active {
    @extend %md-decelerate-func;

    transition: all 0.3s;
  }

  .slide-enter,
  .slide-leave-to {
    transform: translateY(-40px);
  }

  .mt-40 {
    margin-top: 40px;
  }

  .sidebar-container {
    height: 100%;
  }

  .pdf-renderer.pdf-controls-open .sidebar-container {
    height: calc(100% - $controls-height);
  }

  /deep/ .sidebar-container > div {
    height: 100%;
  }

</style>
