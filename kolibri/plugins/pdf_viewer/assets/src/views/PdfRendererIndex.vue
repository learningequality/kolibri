<template>

  <CoreFullscreen
    ref="pdfRenderer"
    class="pdf-renderer"
    :class="{
      'pdf-controls-open': showControls,
      'pdf-full-screen': isInFullscreen,
    }"
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
          class="fullscreen-header pdf-controls-container"
          :style="{ backgroundColor: $themePalette.grey.v_200 }"
        >
          <div>
            <KIconButton
              v-if="outline && outline.length > 0"
              class="controls"
              :ariaLabel="coreString('bookmarksLabel')"
              :tooltip="coreString('bookmarksLabel')"
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
      <KGrid
        class="full-height-container"
        gutter="0"
      >
        <KGridItem
          v-if="showSideBar"
          class="full-height-container"
          :layout8="{ span: 2 }"
          :layout12="{ span: 3 }"
        >
          <SideBar
            id="sidebar-container"
            class="scroller-height"
            :style="{ position: 'sticky', top: 0 }"
            :outline="outline || []"
            :goToDestination="goToDestination"
            :focusDestPage="focusDestPage"
          />
        </KGridItem>
        <KGridItem
          ref="pdfContainer"
          class="full-height-container"
          :layout8="{ span: showSideBar ? 6 : 8 }"
          :layout12="{ span: showSideBar ? 9 : 12 }"
        >
          <RecyclableScroller
            id="pdf-container"
            ref="recycleList"
            :items="pdfPages"
            :buffer="itemHeight * 2"
            :emitUpdate="true"
            class="pdf-container scroller-height"
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
          </RecyclableScroller>
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
  import logger from 'kolibri-logging';
  // polyfill necessary for recycle list
  import 'intersection-observer';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import CoreFullscreen from 'kolibri-common/components/CoreFullscreen';
  import '../utils/domPolyfills';
  import { EventBus } from '../utils/event_utils';
  import RecyclableScroller from './RecyclableScroller';
  import PdfPage from './PdfPage';
  import SideBar from './SideBar';

  const logging = logger.getLogger(__filename);

  // How often should we respond to changes in scrolling to render new pages?
  const renderDebounceTime = 300;
  const scaleIncrement = 0.25;
  const MARGIN = 16;
  export default {
    name: 'PdfRendererIndex',
    components: {
      SideBar,
      PdfPage,
      CoreFullscreen,
      RecyclableScroller,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsLarge, windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsLarge,
        windowIsSmall,
      };
    },
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
      /**
       * @public
       */
      defaultDuration() {
        return this.totalPages * 30;
      },
      debouncedShowVisiblePages() {
        // So as not to share debounced functions between instances of the same component
        // and also to allow access to the cancel method of the debounced function
        // best practice seems to be to do it as a computed property and not a method:
        // https://github.com/vuejs/vue/issues/2870#issuecomment-219096773
        return debounce(this.showVisiblePages, renderDebounceTime);
      },
      screenSizeMultiplier() {
        if (this.windowIsLarge) {
          return 1.25;
        }
        if (this.windowIsSmall) {
          return 1;
        }
        return 1.125;
      },
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
      showSideBar() {
        this.$nextTick(() => {
          if (!this.$refs.pdfContainer || !this.$refs.pdfContainer.$el) {
            return;
          }
          const containerWidth = this.$refs.pdfContainer.$el.clientWidth;
          this.scale = containerWidth / (this.firstPageWidth * this.screenSizeMultiplier);
        });
      },
    },
    beforeCreate() {
      PDFJSLib.GlobalWorkerOptions.workerSrc =
        __webpack_public_path__ + `pdfJSWorker-${__version}.js`;
    },
    created() {
      this.worker = new PDFJSLib.PDFWorker();

      this.worker.promise.catch(error => {
        this.reportLoadingError(error.toString ? error.toString() : error.message);
      });

      this.currentLocation = this.savedLocation;
      const loadingPdf = PDFJSLib.getDocument({
        url: this.defaultFile.storage_url,
        worker: this.worker,
        isEvalSupported: false,
      });
      // pass callback to update loading bar
      loadingPdf.onProgress = loadingProgress => {
        this.progress = loadingProgress.loaded / loadingProgress.total;
      };
      this.eventBus = new EventBus();
      this.prepComponentData = loadingPdf.promise
        .then(async pdfDocument => {
          // Get initial info from the loaded pdf document
          this.pdfDocument = pdfDocument;
          this.totalPages = this.pdfDocument.numPages;
          // Is either the first page or the saved last page visited
          const firstPageToRender = parseInt(this.getSavedPosition() * this.totalPages);

          const firstPage = await this.getPage(firstPageToRender + 1);
          const viewPort = firstPage.getViewport({ scale: 1 });
          this.firstPageHeight = viewPort.height;
          this.firstPageWidth = viewPort.width;
          this.scale = this.$el.clientWidth / (this.firstPageWidth * this.screenSizeMultiplier);

          // init pdfPages array
          // ensuring that firstPageToRender is resolved so that we do not refetch the page
          for (let i = 0; i < this.totalPages; i++) {
            this.pdfPages.push({
              page: i == firstPageToRender ? firstPage : null,
              resolved: i == firstPageToRender,
              size: () => {
                return this.firstPageHeight * this.scale + MARGIN;
              },
              index: i,
            });
          }

          const outline = await pdfDocument.getOutline();
          this.outline = outline;
          this.showSideBar = outline && outline.length > 0 && this.windowIsLarge; // Remove if other tabs are already implemented
          // Reduce the scale slightly if we are showing the sidebar
          // at first load.
          this.scale = this.showSideBar ? 0.75 * this.scale : this.scale;
        })
        .catch(error => {
          this.reportLoadingError(error);
          return Promise.reject(error);
        });
    },
    mounted() {
      // Retrieve the document and its corresponding object
      this.prepComponentData
        .then(() => {
          // Progress is NaN if loadingProgress.total is undefined
          if (isNaN(this.progress)) {
            this.progress = 1;
          }
          this.$emit('startTracking');
          this.updateContentStateInterval = setInterval(this.updateProgress, 30000);
          // Even if user does not pause while scrolling on first page, we store that as visited
          this.storeVisitedPage(1);
        })
        .catch(() => {
          // We have already handled this error above, but we reraised it to ensure that we don't
          // enter the then block above.
          // We need to catch it here to avoid an unhandled promise rejection.
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
            const { height } = pdfPage.getViewport({ scale: 1 });

            // splice so changes are detected
            this.pdfPages.splice(pageIndex, 1, {
              ...this.pdfPages[pageIndex],
              page: pdfPage,
              resolved: true,
              size: () => {
                return height * this.scale + MARGIN;
              },
            });
          });
        }
      },
      storeVisitedPage(currentPageNum) {
        const visited = this.savedVisitedPages;
        visited[currentPageNum] = true;
        this.savedVisitedPages = visited;
      },
      // handle the recycle list update event
      handleUpdate(start, end) {
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

          // determine how many pages user has viewed/visited
          const currentPage = parseInt(this.currentLocation * this.totalPages) + 1;
          // If the user has already scrolled all the way to the end and is still not scrolled
          // to the final page, set the final page as viewed as well.
          if (currentPage === this.totalPages - 1 && this.scrolledToEnd()) {
            this.storeVisitedPage(currentPage + 1);
          }
          // If users has already zoomed then set the scale to that particular zoom scale.
          if (localStorage.getItem('pdf_scale') != null) {
            this.setScale(parseFloat(localStorage.getItem('pdf_scale')));
          }
          this.storeVisitedPage(currentPage);
          this.updateProgress();
          this.updateContentState();
          if (this.scrolledToEnd()) {
            this.$emit('finished');
          }
        }
        this.debouncedShowVisiblePages(start, end);
      },
      showVisiblePages(start, end) {
        const startIndex = Math.floor(start) + 1;
        const endIndex = Math.ceil(end) + 1;
        for (let i = startIndex; i <= endIndex; i++) {
          this.showPage(i);
        }
      },
      zoomIn() {
        this.setScale(Math.min(scaleIncrement * 20, this.scale + scaleIncrement));
      },
      zoomOut() {
        this.setScale(Math.max(scaleIncrement / 2, this.scale - scaleIncrement));
      },
      setScale: throttle(function (scaleValue) {
        this.scale = scaleValue;
        localStorage.setItem('pdf_scale', scaleValue);
      }, 500),
      toggleSideBar() {
        this.showSideBar = !this.showSideBar;
      },
      calculatePosition() {
        return this.$refs.recycleList.$el.scrollTop / this.$refs.recycleList.$el.scrollHeight;
      },
      scrolledToEnd() {
        return (
          this.$refs.recycleList.$el.scrollTop + this.$refs.recycleList.$el.clientHeight ===
          this.$refs.recycleList.$el.scrollHeight
        );
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
      forceUpdateRecycleList() {
        if (this.$refs.recycleList) {
          this.$refs.recycleList.updateVisibleItems(false);
        }
      },
      updateProgress() {
        if (this.forceDurationBasedProgress) {
          // update progress using total time user has spent on the pdf
          this.$emit('updateProgress', this.durationBasedProgress);
        } else {
          // update progress using number of pages seen out of available pages
          this.$emit(
            'updateProgress',
            Object.keys(this.savedVisitedPages).length / this.totalPages,
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
      goToDestination(dest) {
        if (!this.pdfDocument) {
          return;
        }
        Promise.resolve(dest === 'string' ? this.pdfDocument.getDestination(dest) : dest).then(
          explicitDest => {
            if (!Array.isArray(explicitDest)) {
              logging.error('Error getting destination');
              return;
            }

            this.getDestinationPageNumber(explicitDest).then(pageNumber => {
              if (!pageNumber || pageNumber < 1 || pageNumber > this.pagesCount) {
                logging.error('Invalid destination page');
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
              if (this.windowIsSmall) {
                this.showSideBar = false;
              }
            });
          },
        );
      },
      focusDestPage(dest, event) {
        if (!this.pdfDocument) {
          return;
        }
        Promise.resolve(dest === 'string' ? this.pdfDocument.getDestination(dest) : dest).then(
          explicitDest => {
            if (!Array.isArray(explicitDest)) {
              logging.error('Error getting destination');
              return;
            }

            this.getDestinationPageNumber(explicitDest).then(pageNumber => {
              if (!pageNumber || pageNumber < 1 || pageNumber > this.pagesCount) {
                logging.error('Invalid destination page');
                return;
              }

              const isFocused = this.focusPage(pageNumber, event.target);
              if (!isFocused) {
                const position = (pageNumber - 1) / this.totalPages;
                this.scrollTo(position); // scroll to page so the virtual list can render it
                const onPageRendered = e => {
                  if (e.pageNumber === pageNumber) {
                    this.focusPage(pageNumber, event.target);
                    this.eventBus.off('pageRendered', onPageRendered);
                  }
                };
                this.eventBus.on('pageRendered', onPageRendered);
              }
              if (this.windowIsSmall) {
                this.showSideBar = false;
              }
            });
          },
        );
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
          setTimeout(() => {
            // Timeout to avoid catching the keydown event that triggered this.focusPage
            window.addEventListener('keydown', backToBookmark);
          }, 0);
          return true;
        }
        return false;
      },
      /**
       * Get the page number from the explicit destination array.
       * Adaptation of the original function from pdf.js:
       * - https://github.com/mozilla/pdf.js/blob/v2.14.305/web/pdf_link_service.js#L181
       */
      getDestinationPageNumber(explicitDest) {
        return new Promise(resolve => {
          const destRef = explicitDest[0];
          if (typeof destRef === 'object' && destRef !== null) {
            return this.pdfDocument
              .getPageIndex(destRef)
              .then(pageIndex => {
                resolve(pageIndex + 1);
              })
              .catch(e => {
                logging.error('Error getting destination page number', e);
                resolve();
              });
          }
          if (Number.isInteger(destRef)) {
            return resolve(destRef + 1);
          }
          logging.error('Invalid destination reference');
          resolve();
        });
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

  .pdf-renderer {
    @extend %momentum-scroll;
    @extend %dropshadow-2dp;

    position: relative;
    overflow-y: hidden;
  }

  .pdf-container {
    position: relative;
    overflow-y: auto;
  }

  .scroller-height {
    height: calc(100% - #{$controls-height});
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
  /deep/ .vue-recycle-scroller {
    .vue-recycle-scroller-item-wrapper {
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

  .full-height-container {
    height: 100%;
  }

  /deep/ .full-height-container > div {
    height: 100%;
  }

  /deep/ .resize-observer {
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
    display: block;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
    background-color: transparent;
    border: 0;
    opacity: 0;
  }

</style>
