<template>

  <dialog
    v-if="open"
    ref="dialogRef"
    closedby="any"
    class="lightbox-dialog"
    @close="closeLightbox"
    @keydown="onKeyDown"
  >
    <div class="action-bar">
      <div :class="$computedClass(btnHoverStyle)">
        <KIconButton
          id="zoom-out-btn"
          icon="remove"
          color="#FFFFFF"
          size="small"
          aria-label="Zoom out"
          :disabled="scale <= minScale"
          @click="zoomOut"
        />
        <!-- Use UiTooltip separately with appendToBody=false so tooltip stays above backdrop -->
        <UiTooltip
          openOn="hover"
          :appendToBody="false"
          :trigger="`#zoom-out-btn`"
        >
          Zoom out
        </UiTooltip>
      </div>
      <div :class="$computedClass(btnHoverStyle)">
        <KIconButton
          id="zoom-in-btn"
          icon="add"
          color="#FFFFFF"
          size="small"
          aria-label="Zoom in"
          :disabled="scale >= maxScale"
          @click="zoomIn"
        />
        <UiTooltip
          openOn="hover"
          :appendToBody="false"
          :trigger="`#zoom-in-btn`"
        >
          Zoom in
        </UiTooltip>
      </div>
      <div :class="$computedClass(btnHoverStyle)">
        <KIconButton
          id="close-btn"
          icon="close"
          color="#FFFFFF"
          size="small"
          aria-label="Close"
          @click="closeLightbox"
        />
        <UiTooltip
          openOn="hover"
          :appendToBody="false"
          :trigger="`#close-btn`"
        >
          Close
        </UiTooltip>
      </div>
    </div>
    <img
      ref="imageRef"
      :src="src"
      :alt="alt"
      class="expanded-image"
      :class="styleOverrides.windowSizeClass"
      :style="imgStyle"
      @load="calculateSize"
      @mousedown="onMouseDown"
      @dragstart.prevent
    >
  </dialog>

</template>


<script>

  import UiTooltip from 'kolibri-design-system/lib//keen/UiTooltip.vue';

  export default {
    name: 'Lightbox',
    components: { UiTooltip },
    props: {
      open: {
        type: Boolean,
        required: true,
      },
      src: { type: String, required: true },
      alt: { type: String, default: '' },
      styleOverrides: {
        type: Object,
        default: () => ({}),
      },
    },
    data() {
      return {
        scale: 1,
        minScale: 1,
        maxScale: 4,
        scaleStep: 0.25,
        baseSize: { width: 0, height: 0 },
        origin: { x: 0, y: 0 },
        delta: { x: 0, y: 0 },
        backdropSize: { width: 0, height: 0 },
        isDragging: false,
        dragStart: { x: 0, y: 0 },
      };
    },
    computed: {
      imgStyle() {
        if (this.scale == 1) {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const isSmallWindow = this.styleOverrides.windowSizeClass.includes('small-window');
          if (!isSmallWindow) {
            return {
              maxWidth: `${vw - 64}px`,
              maxHeight: `${vh - 40 - 64}px`,
            };
          } else {
            return {
              maxWidth: `${vw - 32}px`,
              maxHeight: `${vh - 40 - 32}px`,
            };
          }
        } else {
          return {
            width: this.baseSize.width * this.scale + 'px',
            height: this.baseSize.height * this.scale + 'px',
            transform: `translate(${this.delta.x}px, ${this.delta.y}px)`,
            cursor: this.isDragging ? 'grabbing' : 'grab',
          };
        }
      },
      btnHoverStyle() {
        return {
          borderRadius: '100%',
          transition: 'background-color 0.15s',
          ':hover': {
            backgroundColor: 'rgba(225, 225, 225, 0.3)',
          },
        };
      },
    },
    watch: {
      open(val) {
        if (val) {
          this.$nextTick(() => {
            if (this.$refs.dialogRef) {
              this.$refs.dialogRef.showModal();
              this.$refs.dialogRef.addEventListener('click', this.onBackdropClick);
              this.scale = 1; // Reset scale when opening lightbox
            }
          });
        } else {
          if (this.$refs.dialogRef) {
            this.$refs.dialogRef.close();
            this.$refs.dialogRef.removeEventListener('click', this.onBackdropClick);
          }
        }
      },
    },
    methods: {
      calculateSize() {
        const img = this.$refs.imageRef;
        this.baseSize.width = img.width;
        this.baseSize.height = img.height;

        this.backdropSize.width = window.innerWidth;
        this.backdropSize.height = window.innerHeight - 40;
      },
      getDeltaLimits() {
        const DeltaLimitX = Math.max(
          (this.baseSize.width * this.scale - this.backdropSize.width) / 2,
          0,
        );
        const DeltaLimitY = Math.max(
          (this.baseSize.height * this.scale - this.backdropSize.height) / 2,
          0,
        );
        return { DeltaLimitX, DeltaLimitY };
      },
      clamp(val, min, max) {
        return Math.max(min, Math.min(val, max));
      },
      clampPosition() {
        const { DeltaLimitX, DeltaLimitY } = this.getDeltaLimits();
        this.delta.x = this.clamp(this.delta.x, -DeltaLimitX, DeltaLimitX);
        this.delta.y = this.clamp(this.delta.y, -DeltaLimitY, DeltaLimitY);
      },
      onMouseDown(e) {
        if (this.scale <= 1) return; // No reposition if not zoomed
        e.preventDefault();
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.origin = { x: this.delta.x, y: this.delta.y };
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
      },
      onMouseMove(e) {
        if (!this.isDragging) return;
        this.delta.x = this.origin.x + (e.clientX - this.dragStart.x);
        this.delta.y = this.origin.y + (e.clientY - this.dragStart.y);
        this.clampPosition();
      },
      onMouseUp() {
        this.isDragging = false;
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
      },
      onKeyDown(e) {
        if (this.scale <= 1) return;
        const step = 50;
        if (e.key === 'ArrowLeft') this.delta.x += step;
        if (e.key === 'ArrowRight') this.delta.x -= step;
        if (e.key === 'ArrowUp') this.delta.y += step;
        if (e.key === 'ArrowDown') this.delta.y -= step;
        this.clampPosition();
      },
      resetPosition() {
        this.delta.x = 0;
        this.delta.y = 0;
      },
      zoomOut() {
        if (this.scale > this.minScale) {
          this.scale = Math.max(this.scale - this.scaleStep, this.minScale);
        }
        this.$nextTick(() => {
          this.clampPosition();
        });
        if (this.scale === 1) this.resetPosition();
      },
      zoomIn() {
        if (this.scale < this.maxScale) {
          this.scale = Math.min(this.scale + this.scaleStep, this.maxScale);
          this.$nextTick(() => {
            this.clampPosition();
          });
        }
      },
      closeLightbox() {
        this.$emit('closeLightbox');
        this.resetPosition();
      },
      // Fallback backdrop click handler for browsers without `closedby` support
      onBackdropClick(e) {
        if (e.target === this.$refs.dialogRef) {
          this.closeLightbox();
        }
      },
    },
  };

</script>


<style>

  .action-bar {
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    z-index: 120;
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: end;
    height: 40px;
    padding-right: 8px;
    background-color: #000000;
  }

  .lightbox-dialog {
    position: fixed;
    inset: 40px 0 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    background: none;
    border: 0;
  }

  .lightbox-dialog::backdrop {
    background-color: rgba(51, 51, 51, 0.5);
  }

  .expanded-image {
    position: relative;
    z-index: 110;
    width: auto;
    height: auto;
  }

</style>
