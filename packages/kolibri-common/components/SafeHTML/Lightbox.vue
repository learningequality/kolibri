<template>

  <dialog
    v-if="open"
    ref="dialogRef"
    closedby="any"
    :aria-label="$tr('expandedImage')"
    class="lightbox-dialog"
    data-testid="lightbox-dialog"
    @close="closeLightbox"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
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

  import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
  import { useEventListener } from '@vueuse/core';
  import dialogPolyfill from 'dialog-polyfill';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const SCALE_STEP = 0.25;

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
    setup(props, { emit }) {
      const { windowIsSmall } = useKResponsiveWindow();
      const $themePalette = themePalette();

      // The action bar is grey.v_900; grey.v_800 is the lightest step that still
      // reads as a hover state against it.
      const btnHoverStyle = computed(() => ({
        borderRadius: '100%',
        transition: 'background-color 0.15s',
        ':hover': {
          backgroundColor: $themePalette.grey.v_800,
        },
      }));

      const dialogRef = ref(null);
      const imageRef = ref(null);

      const scale = ref(MIN_SCALE);
      const baseSize = reactive({ width: 0, height: 0 });
      const delta = reactive({ x: 0, y: 0 });
      const isDragging = ref(false);

      // Scratch state for the gesture handlers — nothing renders from it.
      const origin = { x: 0, y: 0 };
      const dragStart = { x: 0, y: 0 };
      const backdropSize = { width: 0, height: 0 };
      let backdropClickValid = false;
      let pinchStartDistance = 0;
      let pinchStartScale = MIN_SCALE;

      const imgStyle = computed(() => ({
        width: baseSize.width * scale.value + 'px',
        height: baseSize.height * scale.value + 'px',
        transform: `translate(${delta.x}px, ${delta.y}px)`,
        cursor: scale.value > MIN_SCALE ? (isDragging.value ? 'grabbing' : 'grab') : 'auto',
      }));

      function enableTransitionsAfterPaint() {
        // Wait for Vue to apply reactive DOM updates for the new imgStyle
        nextTick(() => {
          // Wait until just before the next paint (frame)
          requestAnimationFrame(() => {
            // Wait until just before the following paint, ensuring image is visually rendered
            requestAnimationFrame(() => {
              // Vue nulls the template ref on teardown, so this also covers unmount
              if (imageRef.value) {
                // Enable CSS transitions now that the image is fully painted
                imageRef.value.classList.add('with-transition');
              }
            });
          });
        });
      }

      /**
       * Compute base image size (scale=1) to fit within viewport minus margins.
       */
      function calculateSize() {
        backdropSize.width = window.innerWidth;
        backdropSize.height = window.innerHeight - 40; // action bar height

        const maxW = backdropSize.width - (windowIsSmall.value ? 32 : 64);
        const maxH = backdropSize.height - (windowIsSmall.value ? 32 : 64);

        const img = imageRef.value;
        if (!img) return;

        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;

        const widthRatio = maxW / naturalW;
        const heightRatio = maxH / naturalH;
        const fitScale = Math.min(widthRatio, heightRatio, 1);

        baseSize.width = Math.round(naturalW * fitScale);
        baseSize.height = Math.round(naturalH * fitScale);

        enableTransitionsAfterPaint();
      }

      function getDeltaLimits(newScale = scale.value) {
        const DeltaLimitX = Math.max((baseSize.width * newScale - backdropSize.width) / 2, 0);
        const DeltaLimitY = Math.max((baseSize.height * newScale - backdropSize.height) / 2, 0);
        return { DeltaLimitX, DeltaLimitY };
      }

      function clampDelta() {
        const { DeltaLimitX, DeltaLimitY } = getDeltaLimits();
        delta.x = clamp(delta.x, -DeltaLimitX, DeltaLimitX);
        delta.y = clamp(delta.y, -DeltaLimitY, DeltaLimitY);
      }

      function onWindowResize() {
        const img = imageRef.value;
        if (img && img.complete) {
          calculateSize();
          clampDelta();
        }
      }

      function canDragFrom(target) {
        return scale.value > MIN_SCALE && target === imageRef.value;
      }

      function startDrag(clientX, clientY) {
        isDragging.value = true;
        imageRef.value.classList.remove('with-transition');
        dragStart.x = clientX;
        dragStart.y = clientY;
        origin.x = delta.x;
        origin.y = delta.y;
      }

      function moveDrag(clientX, clientY) {
        if (!isDragging.value) return;
        delta.x = origin.x + (clientX - dragStart.x);
        delta.y = origin.y + (clientY - dragStart.y);
        clampDelta();
      }

      function endDrag() {
        isDragging.value = false;
        if (imageRef.value) {
          imageRef.value.classList.add('with-transition');
        }
      }

      // Clamped because a pinch may be centred on the backdrop, off the image.
      function centreOffset(clientX, clientY) {
        const rect = imageRef.value.getBoundingClientRect();
        return {
          relX: clamp((clientX - rect.left) / rect.width - 0.5, -0.5, 0.5),
          relY: clamp((clientY - rect.top) / rect.height - 0.5, -0.5, 0.5),
        };
      }

      function onMouseMove(e) {
        moveDrag(e.clientX, e.clientY);
      }

      function onMouseUp() {
        endDrag();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }

      function onMouseDown(e) {
        if (!canDragFrom(e.target)) return;
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      }

      function touchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
      }

      // Touch Events, not Pointer Events: the browserslist floor (Safari 11.1 /
      // iOS 10) predates Pointer Events.
      // Bound on the dialog rather than `.lightbox-inner` beside the mouse
      // handlers: `.lightbox-inner` shrink-wraps the image, so a pinch that
      // starts on the backdrop targets the dialog.
      function onTouchStart(e) {
        if (e.touches.length === 2) {
          // there is nothing to pinch until calculateSize has run
          if (!imageRef.value || !baseSize.width) return;
          pinchStartDistance = touchDistance(e.touches);
          pinchStartScale = scale.value;
          imageRef.value.classList.remove('with-transition');
          return;
        }
        if (!canDragFrom(e.target)) return;
        e.preventDefault();
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }

      // Only cancel a move we are handling: cancelling the first touchmove of a
      // sequence suppresses its compatibility click, which would kill the action
      // bar buttons and backdrop-tap-to-close on any tap with finger jitter.
      function onTouchMove(e) {
        if (e.touches.length === 2) {
          if (!pinchStartDistance || !imageRef.value) return;
          e.preventDefault();
          const { relX, relY } = centreOffset(
            (e.touches[0].clientX + e.touches[1].clientX) / 2,
            (e.touches[0].clientY + e.touches[1].clientY) / 2,
          );
          const pinchRatio = touchDistance(e.touches) / pinchStartDistance;
          applyScale(clamp(pinchStartScale * pinchRatio, MIN_SCALE, MAX_SCALE), relX, relY);
          return;
        }

        if (!isDragging.value) return;
        e.preventDefault();
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      }

      function onTouchEnd() {
        // A bare tap before the image has loaded would otherwise add
        // `with-transition` ahead of enableTransitionsAfterPaint, animating the
        // first sizing up from 0px.
        if (isDragging.value || pinchStartDistance) {
          endDrag();
        }
        pinchStartDistance = 0;
      }

      function handleArrowKeys(e) {
        if (scale.value === MIN_SCALE) {
          return;
        }
        const step = 50;
        if (e.key === 'ArrowLeft') delta.x += step;
        if (e.key === 'ArrowRight') delta.x -= step;
        if (e.key === 'ArrowUp') delta.y += step;
        if (e.key === 'ArrowDown') delta.y -= step;
        clampDelta();
      }

      function resetPosition() {
        delta.x = 0;
        delta.y = 0;
      }

      function closeLightbox() {
        emit('closeLightbox');
        resetPosition();
        scale.value = MIN_SCALE;
      }

      function onKeyDown(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
          e.preventDefault();
          closeLightbox();
          return;
        }

        handleArrowKeys(e);
      }

      function focusFirstEl() {
        const dialog = dialogRef.value;
        if (!dialog) {
          return;
        }
        const focusables = dialog.querySelectorAll('button:not([disabled])');
        if (focusables.length) {
          focusables[0].focus();
        }
      }

      function focusLastEl() {
        const dialog = dialogRef.value;
        if (!dialog) {
          return;
        }
        const focusables = dialog.querySelectorAll('button:not([disabled])');
        if (focusables.length) {
          focusables[focusables.length - 1].focus();
        }
      }

      // relX/relY mark the point held fixed while the scale changes.
      function applyScale(newScale, relX, relY) {
        const prevScale = scale.value;

        // Calculate and clamp new delta values
        const { DeltaLimitX, DeltaLimitY } = getDeltaLimits(newScale);
        let newDeltaX = delta.x - relX * baseSize.width * (newScale - prevScale);
        let newDeltaY = delta.y - relY * baseSize.height * (newScale - prevScale);
        newDeltaX = clamp(newDeltaX, -DeltaLimitX, DeltaLimitX);
        newDeltaY = clamp(newDeltaY, -DeltaLimitY, DeltaLimitY);

        delta.x = newDeltaX;
        delta.y = newDeltaY;
        scale.value = newScale;

        if (scale.value === MIN_SCALE) {
          resetPosition();
        }
      }

      function zoomImage(direction = 'in', relX = 0, relY = 0) {
        // Calculate new scale
        let newScale = scale.value;
        if (direction === 'in' && scale.value < MAX_SCALE) {
          newScale = Math.min(scale.value + SCALE_STEP, MAX_SCALE);
        } else if (direction === 'out' && scale.value > MIN_SCALE) {
          newScale = Math.max(scale.value - SCALE_STEP, MIN_SCALE);
        }
        if (newScale === scale.value) return;

        applyScale(newScale, relX, relY);
      }

      function onWheel(e) {
        e.preventDefault();
        if (!imageRef.value) return;
        const { relX, relY } = centreOffset(e.clientX, e.clientY);
        if (e.deltaY < 0) {
          zoomImage('in', relX, relY);
        } else {
          zoomImage('out', relX, relY);
        }
      }

      // Fallback backdrop mouse event handlers for browsers without `closedby` support
      function onBackdropMouseDown(e) {
        // Only track if mousedown started on the backdrop (not on the actionbar nor image)
        backdropClickValid = e.target === dialogRef.value;
      }

      function onBackdropMouseUp(e) {
        // Only close if started AND ended on the backdrop
        if (backdropClickValid && e.target === dialogRef.value) {
          closeLightbox();
        }
        backdropClickValid = false;
      }

      watch(
        () => props.open,
        val => {
          if (val) {
            nextTick(() => {
              const dlg = dialogRef.value;
              if (!dlg) {
                return;
              }
              dialogPolyfill.registerDialog(dlg);

              dlg.showModal();
              focusFirstEl();

              if (!supportsDialogClosedBy()) {
                dlg.addEventListener('mousedown', onBackdropMouseDown);
                dlg.addEventListener('mouseup', onBackdropMouseUp);
              }
            });
          } else {
            // read before the `v-if` tears the dialog down on re-render
            const dialog = dialogRef.value;
            if (imageRef.value) {
              imageRef.value.classList.remove('with-transition');
            }
            if (dialog) {
              if (typeof dialog.close === 'function') {
                dialog.close();
              } else {
                dialog.removeAttribute('open');
              }

              if (!supportsDialogClosedBy()) {
                dialog.removeEventListener('mousedown', onBackdropMouseDown);
                dialog.removeEventListener('mouseup', onBackdropMouseUp);
              }
            }
          }
        },
      );

      watch(scale, newScale => {
        nextTick(() => {
          if (!imageRef.value) return;
          if (newScale === MIN_SCALE || newScale === MAX_SCALE) {
            imageRef.value.focus();
          }
        });
      });

      useEventListener(window, 'resize', onWindowResize);

      onBeforeUnmount(() => {
        // Extra safety in case the component is destroyed mid-drag
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      });

      return {
        dialogRef,
        imageRef,
        scale,
        minScale: MIN_SCALE,
        maxScale: MAX_SCALE,
        imgStyle,
        btnHoverStyle,
        calculateSize,
        closeLightbox,
        focusFirstEl,
        focusLastEl,
        onKeyDown,
        onMouseDown,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onWheel,
        zoomImage,
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

    /* claim pinch and pan before the browser takes them as page zoom */
    touch-action: none;
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
