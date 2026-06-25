<template>

  <dialog
    v-if="open"
    ref="dialogRef"
    closedby="any"
    :aria-label="$tr('expandedImage')"
    class="lightbox-dialog"
    data-testid="lightbox-dialog"
    @close="closeLightbox"
  >
    <div
      role="presentation"
      class="lightbox-inner"
      @keydown="onKeyDown"
      @mousedown="onMouseDown"
      @wheel="onWheel"
      @dragstart.prevent
    >
      <KFocusTrap
        @shouldFocusFirstEl="focusFirstEl"
        @shouldFocusLastEl="focusLastEl"
      >
        <div
          class="action-bar"
          :style="{ backgroundColor: $themePalette.grey.v_900 }"
        >
          <div :class="scale !== minScale ? $computedClass(btnHoverStyle) : ''">
            <KIconButton
              icon="remove"
              :color="$themeTokens.surface"
              size="small"
              :aria-label="coreString('zoomOut')"
              :tooltip="coreString('zoomOut')"
              :disabled="scale === minScale"
              @click="zoomImage('out')"
            />
          </div>
          <div :class="scale !== maxScale ? $computedClass(btnHoverStyle) : ''">
            <KIconButton
              icon="add"
              :color="$themeTokens.surface"
              size="small"
              :aria-label="coreString('zoomIn')"
              :tooltip="coreString('zoomIn')"
              :disabled="scale === maxScale"
              @click="zoomImage('in')"
            />
          </div>
          <div :class="$computedClass(btnHoverStyle)">
            <KIconButton
              ref="closeButton"
              icon="close"
              :color="$themeTokens.surface"
              size="small"
              :aria-label="coreString('closeAction')"
              :tooltip="coreString('closeAction')"
              @click="closeLightbox"
            />
          </div>
        </div>

        <img
          ref="imageRef"
          :src="src"
          :alt="alt"
          tabindex="-1"
          class="expanded-image"
          :style="imgStyle"
          @load="calculateSize"
        >
      </KFocusTrap>
    </div>
  </dialog>

</template>


<script>

  import dialogPolyfill from 'dialog-polyfill';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  function supportsDialogClosedBy() {
    if (typeof document === 'undefined') {
      return false;
    }
    const dialog = document.createElement('dialog');
    return 'closedBy' in dialog;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(val, max));
  }

  export default {
    name: 'Lightbox',
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();

      return {
        windowIsSmall,
      };
    },
    props: {
      open: {
        type: Boolean,
        required: true,
      },
      src: {
        type: String,
        required: true,
      },
      alt: {
        type: String,
        default: '',
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
        const dialog = this.$refs.dialogRef;

        if (val) {
          this.$nextTick(() => {
            const dlg = this.$refs.dialogRef;
            if (!dlg) {
              return;
            }
            dialogPolyfill.registerDialog(dlg);

            dlg.showModal();
            this.focusFirstEl();

            if (!supportsDialogClosedBy()) {
              dlg.addEventListener('mousedown', this.onBackdropMouseDown);
              dlg.addEventListener('mouseup', this.onBackdropMouseUp);
            }
          });
        } else {
          if (this.$refs.imageRef) {
            this.$refs.imageRef.classList.remove('with-transition');
          }
          if (dialog) {
            if (typeof dialog.close === 'function') {
              dialog.close();
            } else {
              dialog.removeAttribute('open');
            }

            if (!supportsDialogClosedBy()) {
              dialog.removeEventListener('mousedown', this.onBackdropMouseDown);
              dialog.removeEventListener('mouseup', this.onBackdropMouseUp);
            }
          }
        }
      },
      scale(newScale) {
        this.$nextTick(() => {
          if (!this.$refs.imageRef) return;
          if (newScale === this.minScale || newScale === this.maxScale) {
            this.$refs.imageRef.focus();
          }
        });
      },
    },
    mounted() {
      window.addEventListener('resize', this.onWindowResize);
    },
    beforeDestroy() {
      window.removeEventListener('resize', this.onWindowResize);
      // Extra safety in case the component is destroyed mid-drag
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mouseup', this.onMouseUp);
    },
    methods: {
      enableTransitionsAfterPaint() {
        // Wait for Vue to apply reactive DOM updates for the new imgStyle
        this.$nextTick(() => {
          // Wait until just before the next paint (frame)
          requestAnimationFrame(() => {
            // Wait until just before the following paint, ensuring image is visually rendered
            requestAnimationFrame(() => {
              if (this.$refs.imageRef && !this._isDestroyed) {
                // Enable CSS transitions now that the image is fully painted
                this.$refs.imageRef.classList.add('with-transition');
              }
            });
          });
        });
      },

      /**
       * Compute base image size (scale=1) to fit within viewport minus margins.
       */
      calculateSize() {
        this.backdropSize.width = window.innerWidth;
        this.backdropSize.height = window.innerHeight - 40; // action bar height

        const maxW = this.backdropSize.width - (this.windowIsSmall ? 32 : 64);
        const maxH = this.backdropSize.height - (this.windowIsSmall ? 32 : 64);

        const img = this.$refs.imageRef;
        if (!img) return;

        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;

        const widthRatio = maxW / naturalW;
        const heightRatio = maxH / naturalH;
        const scale = Math.min(widthRatio, heightRatio, 1);

        this.baseSize.width = Math.round(naturalW * scale);
        this.baseSize.height = Math.round(naturalH * scale);

        this.enableTransitionsAfterPaint();
      },

      onWindowResize() {
        const img = this.$refs.imageRef;
        if (img && img.complete) {
          this.calculateSize();
          this.clampDelta();
        }
      },
      getDeltaLimits(newScale = this.scale) {
        const DeltaLimitX = Math.max(
          (this.baseSize.width * newScale - this.backdropSize.width) / 2,
          0,
        );
        const DeltaLimitY = Math.max(
          (this.baseSize.height * newScale - this.backdropSize.height) / 2,
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
        if (this.scale <= 1 || !this.$refs.imageRef || e.target !== this.$refs.imageRef) return;
        e.preventDefault();
        this.isDragging = true;
        this.$refs.imageRef.classList.remove('with-transition');
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
        if (this.$refs.imageRef) {
          this.$refs.imageRef.classList.add('with-transition');
        }
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
      },
      onKeyDown(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
          e.preventDefault();
          this.closeLightbox();
          return;
        }

        this.handleArrowKeys(e);
      },
      handleArrowKeys(e) {
        if (this.scale === 1) {
          return;
        }
        const step = 50;
        if (e.key === 'ArrowLeft') this.delta.x += step;
        if (e.key === 'ArrowRight') this.delta.x -= step;
        if (e.key === 'ArrowUp') this.delta.y += step;
        if (e.key === 'ArrowDown') this.delta.y -= step;
        this.clampDelta();
      },

      focusFirstEl() {
        const dialog = this.$refs.dialogRef;
        if (!dialog) {
          return;
        }
        const focusables = dialog.querySelectorAll('button:not([disabled])');
        if (focusables.length) {
          focusables[0].focus();
        }
      },
      focusLastEl() {
        const dialog = this.$refs.dialogRef;
        if (!dialog) {
          return;
        }
        const focusables = dialog.querySelectorAll('button:not([disabled])');
        if (focusables.length) {
          focusables[focusables.length - 1].focus();
        }
      },
      resetPosition() {
        this.delta.x = 0;
        this.delta.y = 0;
      },
      zoomImage(direction = 'in', relX = 0, relY = 0) {
        const prevScale = this.scale;
        // Calculate new scale
        let newScale = this.scale;
        if (direction === 'in' && this.scale < this.maxScale) {
          newScale = Math.min(this.scale + this.scaleStep, this.maxScale);
        } else if (direction === 'out' && this.scale > this.minScale) {
          newScale = Math.max(this.scale - this.scaleStep, this.minScale);
        }
        if (newScale === prevScale) return;

        // Calculate and clamp new delta values
        const { DeltaLimitX, DeltaLimitY } = this.getDeltaLimits(newScale);
        let newDeltaX = this.delta.x - relX * this.baseSize.width * (newScale - prevScale);
        let newDeltaY = this.delta.y - relY * this.baseSize.height * (newScale - prevScale);
        newDeltaX = clamp(newDeltaX, -DeltaLimitX, DeltaLimitX);
        newDeltaY = clamp(newDeltaY, -DeltaLimitY, DeltaLimitY);

        this.delta.x = newDeltaX;
        this.delta.y = newDeltaY;
        this.scale = newScale;

        if (this.scale === 1) {
          this.resetPosition();
        }
      },
      onWheel(e) {
        e.preventDefault();
        const img = this.$refs.imageRef;
        if (!img) return;
        const rect = img.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width - 0.5;
        const relY = (e.clientY - rect.top) / rect.height - 0.5;
        if (e.deltaY < 0) {
          this.zoomImage('in', relX, relY);
        } else {
          this.zoomImage('out', relX, relY);
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
    $trs: {
      expandedImage: {
        message: 'Expanded image',
        context: 'Label for an image that is shown in an expanded view',
      },
    },
  };

</script>


<style>

  @import '~dialog-polyfill/dist/dialog-polyfill.css';

  .action-bar {
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    z-index: 120;
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    height: 40px;
    padding-right: 8px;
  }

  /* Main dialog region under the action bar */
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

  /* Native backdrop */
  .lightbox-dialog::backdrop {
    background-color: rgba(51, 51, 51, 0.5);
  }

  /* Polyfill backdrop (dialog + .backdrop sibling) */
  .lightbox-dialog + .backdrop {
    background-color: rgba(51, 51, 51, 0.5);
  }

  /* Image inside dialog */
  .expanded-image {
    position: relative;
    z-index: 110;
  }

  .expanded-image.with-transition {
    transition:
      transform 0.3s cubic-bezier(0.2, 0, 0.2, 1),
      width 0.3s cubic-bezier(0.2, 0, 0.2, 1),
      height 0.3s cubic-bezier(0.2, 0, 0.2, 1);
  }

  .lightbox-dialog,
  .expanded-image,
  .action-bar {
    user-select: none;
  }

</style>
