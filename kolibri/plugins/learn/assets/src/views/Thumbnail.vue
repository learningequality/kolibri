<template>

  <span
    class="thumbnail"
    :style="{ backgroundColor: $themePalette.grey.v_200 }"
  >
    <LearningActivityIcon
      v-if="contentNode.is_leaf"
      class="icon"
      :kind="contentNode.learning_activities"
    />
    <KIcon
      v-else
      class="icon"
      icon="topic"
      :color="$themePalette.grey.v_500"
    />

    <!--
      we consider thumbnails decorative - empty `alt`
      attribute to hide it from screen readers
    -->
    <img
      v-if="thumbnailUrl"
      class="image"
      :src="thumbnailUrl"
      alt=""
    >
  </span>

</template>


<script>

  import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
  import LearningActivityIcon from './LearningActivityIcon';

  /**
   * Displays a thumbnail in 16:9 ratio. A thumbnail image with
   * a different aspect ratio will be letterboxed to fit 16:9.
   * If a thumbnail image is not available, a generic learning
   * activity/multiple learning activities/topic icon will be
   * displayed (this icon also acts as a placeholder before
   * the image is loaded when it's available).
   */
  export default {
    name: 'Thumbnail',
    components: {
      LearningActivityIcon,
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
    },
    computed: {
      thumbnailUrl() {
        return getContentNodeThumbnail(this.contentNode);
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

    .icon {
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
