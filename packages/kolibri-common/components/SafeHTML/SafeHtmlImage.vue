<template>

  <div
    class="image-container"
    data-testid="image-container"
  >
    <div class="img-wrapper">
      <img
        ref="imgRef"
        class="safe-html"
        :src="src"
        :alt="alt"
        :width="displayWidth"
        :height="displayHeight"
        v-bind="$attrs"
        @load="onLoad"
      >
      <button
        v-if="canExpand"
        ref="overlayRef"
        type="button"
        class="expand-overlay"
        :aria-label="$tr('expandImage')"
        aria-haspopup="dialog"
        @click="openLightbox"
      >
        <span
          class="expand-chip"
          aria-hidden="true"
          :style="{ backgroundColor: 'var(--tokens-surface)' }"
        >
          <KIcon icon="expand" />
        </span>
      </button>
    </div>
    <Lightbox
      :open="lightboxOpen"
      :src="src"
      :alt="alt"
      @closeLightbox="closeLightbox"
    />
  </div>

</template>


<script>

  import { computed, nextTick, ref } from 'vue';
  import { useEventListener, useResizeObserver } from '@vueuse/core';
  import Lightbox from './Lightbox.vue';

  // Below this the 44px chip would cover most of the image.
  const MIN_EXPANDABLE_PX = 100;

  export default {
    name: 'SafeHtmlImage',
    components: {
      Lightbox,
    },
    inheritAttrs: false,
    setup(props) {
      const lightboxOpen = ref(false);
      const canExpand = ref(false);
      const imgRef = ref(null);
      const overlayRef = ref(null);
      const naturalRatio = ref(null);

      // A percentage height resolves against the flex-stretched wrapper, whose
      // height is the image's own, so it would shrink the image; drop it.
      const displayHeight = computed(() =>
        props.height?.includes('%') ? undefined : props.height,
      );

      // A lone height would hold while max-width narrows the image, so derive the
      // width from the natural ratio, as Studio's editor does, and let the
      // `[width]` rule scale the height with it.
      const displayWidth = computed(() => {
        if (props.width || !displayHeight.value || !naturalRatio.value) {
          return props.width;
        }
        return Math.round(parseFloat(displayHeight.value) * naturalRatio.value) || undefined;
      });

      // `naturalWidth` rather than `complete`, which is also true for a failed load.
      function updateExpandAvailability() {
        const img = imgRef.value;
        if (!img || !img.naturalWidth) {
          canExpand.value = false;
          return;
        }
        const { width, height } = img.getBoundingClientRect();
        // layout is fractional CSS px against integer natural px, so round
        // rather than tune an epsilon
        canExpand.value =
          width >= MIN_EXPANDABLE_PX &&
          height >= MIN_EXPANDABLE_PX &&
          (Math.round(width) < img.naturalWidth || Math.round(height) < img.naturalHeight);
      }

      function onLoad() {
        const img = imgRef.value;
        naturalRatio.value = img.naturalHeight ? img.naturalWidth / img.naturalHeight : null;
        updateExpandAvailability();
      }

      function openLightbox() {
        lightboxOpen.value = true;
      }

      // The dialog's own focus restoration does not fire when the click never
      // focused the control, nor under the polyfill.
      function closeLightbox() {
        lightboxOpen.value = false;
        nextTick(() => overlayRef.value?.focus());
      }

      // Rendered size is viewport-dependent through the 80vh cap, and
      // container-dependent besides. Both auto-dispose on unmount; the observer
      // catches a container narrowed without a window resize, the listener
      // covers the browserslist targets that predate ResizeObserver.
      useResizeObserver(imgRef, updateExpandAvailability);
      useEventListener(window, 'resize', updateExpandAvailability);

      return {
        canExpand,
        imgRef,
        lightboxOpen,
        overlayRef,
        displayHeight,
        displayWidth,
        closeLightbox,
        onLoad,
        openLightbox,
      };
    },
    props: {
      src: { type: String, required: true },
      alt: { type: String, default: '' },
      width: { type: String, default: null },
      height: { type: String, default: null },
    },
    $trs: {
      expandImage: 'Expand image',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .image-container {
    display: flex;
    justify-content: center;
    width: 100%;
    max-width: 1200px;
    margin: 16px auto;
  }

  .img-wrapper {
    position: relative;
    display: inline-block;
    max-width: 900px;
  }

  // The only height cap — a second one on the wrapper is what #14110 was.
  img.safe-html {
    display: block;
    max-width: 100%;
    max-height: 80vh;
    margin: 0 auto;
    border: 1px solid var(--tokens-fineLine);
  }

  // Without these a sized image stretches: a height attribute holds while
  // max-width narrows the width, and the 80vh cap cuts the height while the
  // width attribute holds.
  img.safe-html[width] {
    height: auto;
    max-height: none;
  }

  // Longhands rather than `inset`, which is above the browserslist floor.
  // `--content-affordance-display` is a container's opt-out; draggable.scss
  // declares it.
  .expand-overlay {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: var(--content-affordance-display, block);
    padding: 0;
    cursor: pointer;
    background: transparent;
    border: 0;
    opacity: 0;
    transition:
      box-shadow 0.15s,
      opacity 0.15s;
  }

  .expand-overlay:hover,
  .expand-overlay:focus {
    @extend %dropshadow-6dp;

    opacity: 1;
  }

  .expand-chip {
    @extend %dropshadow-2dp;

    position: absolute;
    top: 13px;
    right: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
  }

  // KIcon offsets itself down by 0.125em to sit on a text baseline, which the
  // flex-centred chip does not have.
  .expand-chip svg {
    top: 0;
  }

</style>
