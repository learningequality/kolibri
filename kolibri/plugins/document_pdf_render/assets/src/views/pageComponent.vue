<template>

  <section
    class="pdf-page-container"
    :style="{ height: pageHeight + 'px', width: pageWidth + 'px' }">
    <span class="pdf-page-loading"> {{ $formatNumber(pageNum) }}</span>
    <canvas
      v-show="active"
      class="canvas"
      ref="canvas"
      dir="ltr"
      :height="pageHeight"
      :width="pageWidth">
    </canvas>
  </section>

</template>


<script>

  export default {
    props: {
      defaultHeight: {
        type: Number,
      },
      defaultWidth: {
        type: Number,
      },
      scale: {
        type: Number,
      },
      pageNum: {
        type: Number,
      },
      pdfPage: {
        default: null,
      },
    },
    data: () => ({
      height: null,
      width: null,
      canvas: null,
      active: false,
      rendered: false,
    }),
    computed: {
      pageHeight() {
        return this.height || this.defaultHeight;
      },
      pageWidth() {
        return this.width || this.defaultWidth;
      },
    },
    watch: {
      scale: 'renderPage',
      active: 'renderPage',
      pdfPage: 'renderPage',
    },
    methods: {
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
        canvasContext.clearRect(0, 0, this.height, this.width);
        this.rendered = false;
      },
      getViewport() {
        // Get viewport, which contains directions to be passed into render function
        return this.pdfPage.getViewport(this.scale);
      },
      setPageDimensions() {
        // Set height and width based on the the pdfPage information and the scale
        this.height = this.pdfPage.view[3] * this.scale;
        this.width = this.pdfPage.view[2] * this.scale;
      },
      renderPage(newVal, oldVal) {
        if (typeof newVal === 'number' && typeof oldVal === 'number' && newVal !== oldVal) {
          // Change values are numeric, so we should assume it is a change in scale
          this.cancelRender();
          this.setPageDimensions();
        }
        if (this.pdfPage && this.active) {
          if (!this.renderTask && !this.rendered) {
            const canvasContext = this.$refs.canvas.getContext('2d');

            const viewport = this.getViewport();

            this.setPageDimensions();

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
          }
        } else if (this.pdfPage && this.pdfPage.getViewport) {
          // We have a pdfPage, so use this opportunity to set the current page width and height
          this.setPageDimensions();
        } else {
          // No pdfPage and not active, either we are not being asked to render a page yet, or it has been removed
          // so we should tear down any existing page
          this.cancelRender();
          this.clearPage();
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  // Also defined in index.vue
  $page-padding = 5px

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

  .canvas
    position: absolute
    top: 0
    left: 0

</style>
