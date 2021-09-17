<template>

  <div
    class="card-thumbnail-wrapper"
    :class="{ 'mobile-thumbnail': isMobile }"
    :style="thumbnailBackground"
  ></div>

</template>


<script>

  export default {
    name: 'CardThumbnail',
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

  @import './card';

  .card-thumbnail-wrapper {
    position: relative;
    width: 100%;
    height: $thumb-height-desktop;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
  }

  .content-icon-wrapper {
    position: absolute;
    width: 56px;
    height: 56px;
  }

  /* MOBILE OVERRIDES */
  .mobile-thumbnail.card-thumbnail-wrapper {
    width: 100%;
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
