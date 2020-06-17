<template>

  <CoreFullscreen
    ref="pdfRenderer"
    class="pdf-renderer"
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
          class="fullscreen-header"
          :style="{ backgroundColor: this.$themePalette.grey.v_100 }"
        >
          <UiIconButton
            class="button-zoom-in controls"
            aria-controls="pdf-container"
            @click="zoomIn"
          >
            <mat-svg
              name="add"
              category="content"
            />
          </UiIconButton>
          <UiIconButton
            class="button-zoom-out controls"
            aria-controls="pdf-container"
            @click="zoomOut"
          >
            <mat-svg
              name="remove"
              category="content"
            />
          </UiIconButton>
          <KButton
            class="fullscreen-button"
            :primary="false"
            appearance="flat-button"
            @click="$refs.pdfRenderer.toggleFullscreen()"
          >
            <mat-svg
              v-if="isInFullscreen"
              name="fullscreen_exit"
              category="navigation"
            />
            <mat-svg
              v-else
              name="fullscreen"
              category="navigation"
            />
            {{ fullscreenText }}
          </KButton>
        </div>
      </transition>
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
        <template slot-scope="{ item }">
          <PdfPage
            :key="item.index"
            :pageNum="item.index + 1"
            :pdfPage="pdfPages[item.index].page"
            :pageReady="pdfPages[item.index].resolved"
            :firstPageHeight="firstPageHeight || 0"
            :firstPageWidth="firstPageWidth || 0"
            :scale="scale || 1"
          />
        </template>
      </RecycleList>
    </template>
  </CoreFullscreen>

</template>


<script>

  import { mapGetters } from 'vuex';
  import PDFJSLib from 'pdfjs-dist';
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
  import urls from 'kolibri.urls';

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

  import PdfPage from './PdfPage';
  // Source from which PDFJS loads its service worker, this is based on the __publicPath
  // global that is defined in the Kolibri webpack pipeline, and the additional entry in the PDF
  // renderer's own webpack config
  PDFJSLib.PDFJS.workerSrc = urls.static(`${__kolibriModuleName}/pdfJSWorker-${__version}.js`);

  // How often should we respond to changes in scrolling to render new pages?
  const renderDebounceTime = 300;
  const scaleIncrement = 0.25;
  const MARGIN = 16;

  export default {
    name: 'PdfRendererIndex',
    components: {
      UiIconButton,
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
    }),
    computed: {
      ...mapGetters(['sessionTimeSpent']),
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
      targetTime() {
        return this.totalPages * 30;
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
      fullscreenText() {
        return this.isInFullscreen ? this.$tr('exitFullscreen') : this.$tr('enterFullscreen');
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
    created() {
      this.currentLocation = this.savedLocation;
      this.showControls = true; // Ensures it shows on load even if we're scrolled
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
          this.scale = this.elementWidth / (this.firstPageWidth + MARGIN);
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
        this.updateContentStateInterval = setInterval(this.updateProgress, 30000);
        // Automatically master after the targetTime, convert seconds -> milliseconds
        this.timeout = setTimeout(this.updateProgress, this.targetTime * 1000);
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
        this.$emit('updateProgress', this.sessionTimeSpent / this.targetTime);
      },
      updateContentState() {
        let contentState;
        if (this.extraFields) {
          contentState = {
            ...this.extraFields.contentState,
            savedLocation: this.currentLocation || this.savedLocation,
          };
        } else {
          contentState = { savedLocation: this.currentLocation || this.savedLocation };
        }
        this.$emit('updateContentState', contentState);
      },
    },
    $trs: {
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  $controls-height: 40px;

  .pdf-renderer {
    @extend %momentum-scroll;
    @extend %dropshadow-2dp;

    position: relative;
    height: 500px;
    // This ensures that showing vs hiding the controls
    // will not cover visible content below (ie, author name)
    margin-bottom: $controls-height;
    overflow-y: hidden;
  }

  .controls {
    position: relative;
    z-index: 0; // Hide icons with transition
    width: 24px;
    height: 24px;
    margin: 0 4px;
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
    z-index: 24;
    height: $controls-height;
    text-align: end;
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

</style>
