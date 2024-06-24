<template>

  <div
    :id="`pdf-page-${pageNum}`"
    ref="pageContainer"
    class="pdf-page"
    role="region"
    :aria-label="$tr('numPage', { number: pageNum, total: totalPages })"
    :style="{
      height: `${scaledHeight}px`,
      width: `${scaledWidth}px`,
      background: $themeTokens.surface,
    }"
  >
    <span
      class="loading"
      aria-hidden="true"
    >{{ $formatNumber(pageNum) }}</span>
    <canvas
      v-show="rendered"
      ref="canvas"
      class="canvas"
      dir="ltr"
      :height="scaledHeight"
      :width="scaledWidth"
    >
    </canvas>
    <div
      ref="textLayer"
      class="text-layer"
      :style="{
        height: `${scaledHeight}px`,
        width: `${scaledWidth}px`,
      }"
    ></div>
  </div>

</template>


<script>

  import { AnnotationMode } from 'pdfjs-dist/legacy/build/pdf';
  import TextLayerBuilder from '../utils/text_layer_builder';
  import StrucTreeLayerBuilder from '../utils/struct_tree_layer_builder';
  import { AnnotationLayerBuilder } from '../utils/annotation_layer_builder';
  import { SimpleLinkService } from '../utils/pdf_link_service';

  export default {
    name: 'PdfPage',
    props: {
      pageNum: {
        type: Number,
        required: true,
      },
      totalPages: {
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
      eventBus: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        // TODO figure out if this is needed
        // canvas: null,
        rendered: false,
      };
    },
    computed: {
      scaledHeight() {
        if (!this.pdfPage) {
          return this.firstPageHeight * this.scale;
        }
        const viewport = this.getViewport();
        return viewport.height;
      },
      scaledWidth() {
        if (!this.pdfPage) {
          return this.firstPageWidth * this.scale;
        }
        const viewport = this.getViewport();
        return viewport.width;
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
        return this.pdfPage.getViewport({ scale: this.scale || 1 });
      },
      renderPage(newVal, oldVal) {
        if (typeof newVal === 'number' && typeof oldVal === 'number' && newVal !== oldVal) {
          // Change values are numeric, so we should assume it is a change in scale
          this.cancelRender();
        }
        if (this.pdfPage && this.pageReady && !this.renderTask && !this.rendered) {
          this.createTextLayerBuilder();
          this.createStructTreeLayerBuilder();
          this.createAnnotationLayerBuilder();
          const canvasContext = this.$refs.canvas.getContext('2d');
          const viewport = this.getViewport();

          this.renderTask = this.pdfPage.render({
            canvasContext,
            viewport,
            annotationMode: AnnotationMode.ENABLE_FORMS,
            annotationCanvasMap: this.annotationCanvasMap,
          });
          this.renderTask.promise.then(
            () => {
              delete this.renderTask;
              if (this.textLayer) {
                const readableStream = this.pdfPage.streamTextContent({
                  includeMarkedContent: true,
                });
                this.textLayer.setTextContentStream(readableStream);
                this.textLayer.render();
              }
              if (this.annotationLayer) {
                this.annotationLayer.render(viewport, 'display');
              }
              this.rendered = true;
              this.eventBus.emit('pageRendered', {
                pageNumber: this.pageNum,
              });
            },
            () => {
              delete this.renderTask;
              this.rendered = false;
            },
          );
          this.eventBus.on('textlayerrendered', this.onTextLayerRendered);
        } else if (!this.pdfPage) {
          // No pdfPage, either we are not being asked to render a page yet,
          // or it has been removed so we should tear down any existing page
          this.cancelRender();
          this.clearPage();
        }
      },
      cancelRender() {
        if (this.textLayer) {
          this.textLayer.cancel();
          this.textLayer = null;
        }
        if (this.renderTask) {
          this.renderTask.cancel();
        }
        this.eventBus.off('textlayerrendered', this.onTextLayerRendered);
        delete this.renderTask;
        this.rendered = false;
      },
      clearPage() {
        const canvasContext = this.$refs.canvas.getContext('2d');
        // Clear canvas
        canvasContext.clearRect(0, 0, this.scaledHeight, this.scaledWidth);
        this.rendered = false;
      },
      createTextLayerBuilder() {
        this.textLayer = new TextLayerBuilder({
          textLayerDiv: this.$refs.textLayer,
          viewport: this.getViewport(),
          pageIndex: this.pageNum - 1,
          enhanceTextSelection: true,
          eventBus: this.eventBus,
        });
      },
      createStructTreeLayerBuilder() {
        this.structTreeLayer = new StrucTreeLayerBuilder(this.$refs.textLayer);
      },
      createAnnotationLayerBuilder() {
        if (!this.annotationLayer) {
          this.annotationCanvasMap = new Map();
          this.annotationLayer = new AnnotationLayerBuilder({
            pageDiv: this.$refs.pageContainer,
            pdfPage: this.pdfPage,
            annotationCanvasMap: this.annotationCanvasMap,
            linkService: new SimpleLinkService(),
          });
        }
      },
      onTextLayerRendered(event) {
        if (event.pageNumber !== this.pageNum) {
          return;
        }
        this.eventBus.off('textlayerrendered', this.onTextLayerRendered);
        if (!this.$refs.canvas) {
          return; // The canvas was removed, prevent errors below.
        }
        // The structure tree must be generated after the text layer for the
        // aria-owns to work.
        this.pdfPage.getStructTree().then(tree => {
          if (!tree) {
            return;
          }
          if (!this.$refs.canvas) {
            return;
          }
          const treeDom = this.structTreeLayer.render(tree);
          treeDom.classList.add('structTree');
          this.$refs.canvas.appendChild(treeDom);
        });
      },
    },
    $trs: {
      numPage: 'Page {number} of {total}',
    },
  };

</script>


<style lang="scss" scoped>

  // Also defined in index.vue
  $page-margin: 8px;

  @import '../utils/text_layer_builder.css';
  @import '../utils/annotation_layer_builder.css';

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
