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
        :style="[contentStyle, imageStyle]"
        v-bind="$attrs"
        @load="updateExpandAvailability"
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
          :style="{ backgroundColor: $themeTokens.surface }"
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

  import { computed, getCurrentInstance, nextTick, ref } from 'vue';
  import { useEventListener, useResizeObserver } from '@vueuse/core';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import Lightbox from './Lightbox.vue';
  import parseStyleString from './parseStyleString';

  // Below this the 44px chip would cover most of the image.
  const MIN_EXPANDABLE_PX = 100;

  export default {
    name: 'SafeHtmlImage',
    components: {
      Lightbox,
    },
    inheritAttrs: false,
    setup() {
      const $themeTokens = themeTokens();
      const instance = getCurrentInstance();

      const lightboxOpen = ref(false);
      const canExpand = ref(false);
      const imgRef = ref(null);
      const overlayRef = ref(null);

      // The allowlisted style carried through from the sanitized <img>. Merged
      // ahead of imageStyle so the component's own border wins on any future key
      // overlap while the carried colour/alignment still apply.
      //
      // `$attrs` off the instance rather than setup()'s `attrs`: that proxy only
      // defines the keys present when it was last synced, so an absent `style`
      // tracks nothing and never recovers once SafeHTML — which matches images
      // positionally — reuses this instance for an <img> that carries one.
      const contentStyle = computed(() => parseStyleString(instance.proxy.$attrs.style));

      const imageStyle = computed(() => ({
        border: `1px solid ${$themeTokens.fineLine}`,
      }));

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
        contentStyle,
        imageStyle,
        imgRef,
        lightboxOpen,
        overlayRef,
        closeLightbox,
        openLightbox,
        updateExpandAvailability,
      };
    },
    props: {
      src: { type: String, required: true },
      alt: { type: String, default: '' },
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
