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
          class="safe-html"
          :src="src"
          :alt="alt"
          :style="[contentStyle, imageStyle]"
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
  import parseStyleString from './parseStyleString';

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
      // The allowlisted style carried through from the sanitized <img>. Merged
      // ahead of imageStyle so the component's own border wins on any future key
      // overlap while the carried colour/alignment still apply.
      contentStyle() {
        return parseStyleString(this.$attrs.style);
      },
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
    transition: box-shadow 0.15s;
  }

  // The only height cap — a second one on the wrapper is what #14110 was.
  img.safe-html {
    display: block;
    max-width: 100%;
    max-height: 80vh;
    margin: 0 auto;
  }

  .img-button {
    display: block;
    padding: 0;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

</style>
