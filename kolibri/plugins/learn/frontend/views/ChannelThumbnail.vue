<template>

  <div
    class="card-thumbnail-wrapper"
    :class="{ 'mobile-thumbnail': isMobile }"
    :style="thumbnailBackground"
  >
    <ContentIcon
      v-if="!thumbnail"
      kind="channel"
      class="type-icon"
      :color="$themeTokens.annotation"
    />
  </div>

</template>


<script>

  import ContentIcon from 'kolibri-common/components/labels/ContentIcon';

  export default {
    name: 'ChannelThumbnail',
    components: {
      ContentIcon,
    },
    props: {
      thumbnail: {
        type: String,
        default: null,
      },
      isMobile: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      thumbnailBackground() {
        return {
          backgroundColor: this.$themeTokens.surface,
          backgroundImage: this.thumbnail ? `url('${this.thumbnail}')` : '',
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  $ratio: 16 / 9;

  $thumb-width-desktop: 210px;
  $thumb-height-desktop: round($thumb-width-desktop / $ratio);

  $thumb-height-mobile: 92px;
  $thumb-width-mobile: round($thumb-height-mobile * $ratio);

  .card-thumbnail-wrapper {
    position: relative;
    width: $thumb-width-desktop;
    height: $thumb-height-desktop;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    // Add an extra border to contain the progress bar and not have it overlap the image
    border-bottom: solid transparent 5px;
  }

  .type-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(3);
  }

  .progress-icon {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .content-icon-wrapper {
    position: absolute;
    width: 56px;
    height: 56px;
  }

  .content-icon {
    position: absolute;
    font-size: 20px;
    transform: translate(25%, 0);
  }

  .content-icon-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    fill-opacity: 0.9;
  }

  .progress-bar-wrapper {
    position: absolute;
    bottom: -5px;
    width: 100%;
    height: 5px;
    opacity: 0.9;
  }

  .progress-bar {
    height: 100%;
  }

  /* MOBILE OVERRIDES */
  .mobile-thumbnail.card-thumbnail-wrapper {
    width: $thumb-width-mobile;
    height: $thumb-height-mobile;
  }

  .mobile-thumbnail {
    .type-icon {
      transform: translate(-50%, -50%) scale(2);
    }

    .content-icon-wrapper {
      width: 48px;
      height: 48px;
    }

    .content-icon {
      font-size: 18px;
    }
  }

</style>
