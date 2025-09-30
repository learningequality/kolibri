<template>

  <div
    class="image-container"
    data-testid="image-container"
  >
    <div class="img-wrapper">
      <img
        :src="src"
        :alt="alt"
        v-bind="$attrs"
        @click="openLightbox"
      >
      <KIconButton
        class="expand-btn expand-btn-transition"
        icon="expand"
        appearance="raised-button"
        :aria-label="$tr('expandImage')"
        aria-haspopup="dialog"
        :tooltip="$tr('expandImage')"
        @click="openLightbox"
      />
    </div>
    <Lightbox
      :open="lightboxOpen"
      :src="src"
      :alt="alt"
      :styleOverrides="styleOverrides"
      @closeLightbox="closeLightbox"
    />
  </div>

</template>


<script>

  import Lightbox from './Lightbox.vue';

  export default {
    name: 'SafeHtmlImage',
    components: {
      Lightbox,
    },
    inheritAttrs: false,
    props: {
      src: { type: String, required: true },
      alt: { type: String, default: '' },
      styleOverrides: {
        type: Object,
        default: () => ({}),
      },
    },
    data() {
      return {
        lightboxOpen: false,
      };
    },
    methods: {
      openLightbox() {
        this.lightboxOpen = true;
      },
      closeLightbox() {
        this.lightboxOpen = false;
      },
    },
    $trs: {
      expandImage: 'Expand image',
    },
  };

</script>


<style lang="scss" scoped>

  .expand-btn-transition {
    transition:
      color 0.15s,
      background-color 0.15s,
      box-shadow 0.15s,
      opacity 0.15s;
  }

</style>
