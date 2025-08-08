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
          :disabled="scale === minScale"
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
          :disabled="scale === maxScale"
          autofocus
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
      tabindex="-1"
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

  function supportsDialogClosedBy() {
    const dialog = document.createElement('dialog');
    return 'closedBy' in dialog;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(val, max));
  }

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
        backdropClickValid: false,
      };
    },
    computed: {
      imgStyle() {
        return {
          width: this.baseSize.width * this.scale + 'px',
          height: this.baseSize.height * this.scale + 'px',
          transform: `translate(${this.delta.x}px, ${this.delta.y}px)`,
          cursor: this.scale > 1 ? (this.isDragging ? 'grabbing' : 'grab') : 'auto',
        };
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
              if (!supportsDialogClosedBy()) {
                this.$refs.dialogRef.addEventListener('mousedown', this.onBackdropMouseDown);
                this.$refs.dialogRef.addEventListener('mouseup', this.onBackdropMouseUp);
              }
            }
          });
        } else {
          if (this.$refs.dialogRef) {
            this.$refs.dialogRef.close();
            if (!supportsDialogClosedBy()) {
              this.$refs.dialogRef.removeEventListener('mousedown', this.onBackdropMouseDown);
              this.$refs.dialogRef.removeEventListener('mouseup', this.onBackdropMouseUp);
            }
          }
        }
      },
      scale(newScale) {
        this.$nextTick(() => {
          if (!this.$refs.imageRef) return;
          // Keep focus within the dialog when zoom-out or zoom-in button become disabled
          if (newScale == this.minScale || newScale == this.maxScale) {
            this.$refs.imageRef.focus();
            return;
          }
        });
      },
    },
    mounted() {
      window.addEventListener('resize', this.onWindowResize);
    },
    beforeDestroy() {
      window.removeEventListener('resize', this.onWindowResize);
    },
    methods: {
      calculateSize() {
        this.backdropSize.width = window.innerWidth;
        this.backdropSize.height = window.innerHeight - 40; // 40px for action bar
        const isSmallWindow = this.styleOverrides.windowSizeClass.includes('small-window');
        const maxW = this.backdropSize.width - (isSmallWindow ? 32 : 64); // 32px margin for small window, 64px for larger
        const maxH = this.backdropSize.height - (isSmallWindow ? 32 : 64);

        const img = this.$refs.imageRef;
        if (!img) return;
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;

        const widthRatio = maxW / naturalW;
        const heightRatio = maxH / naturalH;
        const scale = Math.min(widthRatio, heightRatio, 1);
        this.baseSize.width = Math.round(naturalW * scale);
        this.baseSize.height = Math.round(naturalH * scale);
      },
      onWindowResize() {
        const img = this.$refs.imageRef;
        if (img && img.complete) {
          this.calculateSize();
          this.clampDelta();
        }
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
      clampDelta() {
        const { DeltaLimitX, DeltaLimitY } = this.getDeltaLimits();
        this.delta.x = clamp(this.delta.x, -DeltaLimitX, DeltaLimitX);
        this.delta.y = clamp(this.delta.y, -DeltaLimitY, DeltaLimitY);
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
        this.clampDelta();
      },
      onMouseUp() {
        this.isDragging = false;
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
      },
      onKeyDown(e) {
        this.handleArrowKeys(e);
        this.handleTab(e);
      },
      handleArrowKeys(e) {
        if (this.scale === 1) return;
        const step = 50;
        if (e.key === 'ArrowLeft') this.delta.x += step;
        if (e.key === 'ArrowRight') this.delta.x -= step;
        if (e.key === 'ArrowUp') this.delta.y += step;
        if (e.key === 'ArrowDown') this.delta.y -= step;
        this.clampDelta();
      },
      handleTab(e) {
        var focusables = this.$refs.dialogRef.querySelectorAll('button:not([disabled])');
        if (!focusables.length) return;
        var firstFocusable = focusables[0];
        var lastFocusable = focusables[focusables.length - 1];
        if (e.shiftKey && e.key === 'Tab') {
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else if (e.key === 'Tab') {
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
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
          this.clampDelta();
        });
        if (this.scale === 1) this.resetPosition();
      },
      zoomIn() {
        if (this.scale < this.maxScale) {
          this.scale = Math.min(this.scale + this.scaleStep, this.maxScale);
          this.$nextTick(() => {
            this.clampDelta();
          });
        }
      },
      closeLightbox() {
        this.$emit('closeLightbox');
        this.resetPosition();
        this.scale = 1;
      },
      // Fallback backdrop mouse event handlers for browsers without `closedby` support
      onBackdropMouseDown(e) {
        // Only track if mousedown started on the backdrop (not on the actionbar nor image)
        this.backdropClickValid = e.target === this.$refs.dialogRef;
      },
      onBackdropMouseUp(e) {
        // Only close if started AND ended on the backdrop
        if (this.backdropClickValid && e.target === this.$refs.dialogRef) {
          this.closeLightbox();
        }
        this.backdropClickValid = false;
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
    padding: 0;
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
  }

  .lightbox-dialog,
  .expanded-image,
  .action-bar {
    user-select: none;
  }

</style>
