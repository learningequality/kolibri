<template>

  <div
    class="image-container"
    data-testid="image-container"
  >
    <div class="img-wrapper">
      <button
        class="img-button"
        :aria-label="$tr('expandImage')"
        aria-haspopup="dialog"
        @click="openLightbox"
      >
        <img
          :src="src"
          :alt="alt"
          :style="imageStyle"
          v-bind="$attrs"
        >
      </button>
      <KIconButton
        class="expand-btn expand-btn-transition"
        icon="expand"
        appearance="raised-button"
        aria-hidden="true"
        tabindex="-1"
        :tooltip="$tr('expandImage')"
        @click="openLightbox"
      />
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
    },
    data() {
      return {
        lightboxOpen: false,
      };
    },
    computed: {
      imageStyle() {
        return {
          border: `1px solid ${this.$themeTokens.fineLine}`,
        };
      },
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

  .img-wrapper {
    max-width: 900px;
    max-height: 584px;
  }

  .img-button {
    display: block;
    padding: 0;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

</style>
