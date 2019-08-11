<template>

  <section
    class="pdf-page"
    :style="{
      height: `${scaledHeight}px`,
      width: `${scaledWidth}px`,
      background: $themeTokens.surface,
    }"
  >
    <span class="loading">{{ $formatNumber(pageNum) }}</span>
    <canvas
      v-show="rendered"
      ref="canvas"
      class="canvas"
      dir="ltr"
      :height="scaledHeight"
      :width="scaledWidth"
    >
    </canvas>
  </section>

</template>


<script>

  export default {
    name: 'PdfPage',
    props: {
      pageNum: {
        type: Number,
        required: true,
      },
      pdfPage: {
        type: [Object, Promise],
        default: null,
      },
      pageReady: {
        type: Boolean,
        required: true,
      },
      scale: {
        type: Number,
        required: true,
      },
      firstPageHeight: {
        type: Number,
        required: true,
      },
      firstPageWidth: {
        type: Number,
        required: true,
      },
    },
    data: () => ({
      canvas: null,
      rendered: false,
    }),
    computed: {
      actualHeight() {
        if (!this.pageReady) {
          return null;
        }
        return this.pdfPage.view[3];
      },
      actualWidth() {
        if (!this.pageReady) {
          return null;
        }
        return this.pdfPage.view[2];
      },
      heightToWidthRatio() {
        return this.actualHeight / this.actualWidth || this.firstPageHeight / this.firstPageWidth;
      },
      scaledHeight() {
        return this.firstPageHeight * this.scale;
      },
      scaledWidth() {
        return this.scaledHeight / this.heightToWidthRatio;
      },
      pageScale() {
        return this.scaledHeight / this.actualHeight || this.scale;
      },
    },
    watch: {
      scale(newVal, oldVal) {
        this.renderPage(newVal, oldVal);
      },
      pdfPage(newVal, oldVal) {
        this.renderPage(newVal, oldVal);
      },
      pageReady(newVal, oldVal) {
        this.renderPage(newVal, oldVal);
      },
    },
    mounted() {
      this.renderPage();
    },
    methods: {
      getViewport() {
        // Get viewport, which contains directions to be passed into render function
        return this.pdfPage.getViewport(this.pageScale);
      },
      renderPage(newVal, oldVal) {
        if (typeof newVal === 'number' && typeof oldVal === 'number' && newVal !== oldVal) {
          // Change values are numeric, so we should assume it is a change in scale
          this.cancelRender();
        }
        if (this.pdfPage && this.pageReady && !this.renderTask && !this.rendered) {
          const canvasContext = this.$refs.canvas.getContext('2d');
          const viewport = this.getViewport();

          this.renderTask = this.pdfPage.render({
            canvasContext,
            viewport,
          });
          this.renderTask.then(
            () => {
              delete this.renderTask;
              this.rendered = true;
            },
            () => {
              delete this.renderTask;
              this.rendered = false;
            }
          );
        } else if (!this.pdfPage) {
          // No pdfPage, either we are not being asked to render a page yet,
          // or it has been removed so we should tear down any existing page
          this.cancelRender();
          this.clearPage();
        }
      },
      cancelRender() {
        if (this.renderTask) {
          this.renderTask.cancel();
        }
        delete this.renderTask;
        this.rendered = false;
      },
      clearPage() {
        const canvasContext = this.$refs.canvas.getContext('2d');
        // Clear canvas
        canvasContext.clearRect(0, 0, this.scaledHeight, this.scaledWidth);
        this.rendered = false;
      },
    },
  };

</script>


<style lang="scss" scoped>

  // Also defined in index.vue
  $page-margin: 8px;

  .pdf-page {
    position: relative;
    z-index: 2; // material spec - card (resting)
    margin: $page-margin auto;
  }

  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: 2em;
    line-height: 100%;
    transform: translate(-50%, -50%);
  }

  .canvas {
    position: absolute;
    top: 0;
    left: 0;
  }

</style>
