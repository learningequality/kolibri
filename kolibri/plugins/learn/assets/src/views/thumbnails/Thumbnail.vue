<template>

  <span
    class="thumbnail"
    :style="thumbnailStyles"
  >
    <span class="icon">
      <slot name="icon"></slot>
    </span>

    <!--
      we consider thumbnails decorative - empty `alt`
      attribute to hide it from screen readers
    -->
    <img
      v-if="thumbnailUrl"
      class="image"
      :src="thumbnailUrl"
      alt=""
      loading="lazy"
    >
    <slot name="labels"></slot>
  </span>

</template>


<script>

  /**
   * Displays a thumbnail in 16:9 ratio. A thumbnail image with
   * a different aspect ratio will be letterboxed to fit 16:9.
   * If a thumbnail image is not available, an icon from
   * `icon` slot will be displayed when provided (the icon can
   * also acts as a placeholder before the image is loaded)
   * on top of gray placeholder background.
   */
  export default {
    name: 'Thumbnail',
    props: {
      thumbnailUrl: {
        type: String,
        required: false,
        default: '',
      },
      rounded: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    computed: {
      thumbnailStyles() {
        const styles = {
          backgroundColor: this.$themePalette.grey.v_100,
        };
        if (this.rounded) {
          styles.borderRadius = '4px';
          styles.overflow = 'hidden';
        }
        return styles;
      },
    },
  };

</script>


<style lang="scss" scoped>

  /*
  16:9 aspect ratio with letterboxing (9 / 16 = 0.5625 = 56.25%)
  https://www.sitepoint.com/maintain-image-aspect-ratios-responsive-web-design/
*/
  .thumbnail {
    position: relative;
    display: block;
    height: 0;
    padding: 56.25% 0 0;

    .image {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 2;
      display: block;
      max-width: 100%;
      max-height: 100%;
      margin: auto;
    }

    .icon > * {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 1;
      display: block;
      width: 25%;
      max-width: 56px;
      height: auto;
      margin: auto;
      opacity: 0.3;
    }
  }

</style>
