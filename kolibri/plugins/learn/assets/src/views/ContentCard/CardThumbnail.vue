<template>

  <div
    class="card-thumbnail-wrapper"
    :class="{ 'mobile-thumbnail': isMobile }"
    :style="thumbnailBackground"
  >
    <div
      v-if="activityLength"
      :class="isRtl ? 'chip-right' : 'chip-left' "
      :style="{ color: $themeTokens.textInverted }"
    >
      {{ coreString(activityLength) }}
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'CardThumbnail',
    mixins: [commonCoreStrings],
    props: {
      thumbnail: {
        type: String,
        default: null,
      },
      isMobile: {
        type: Boolean,
        default: false,
      },
      activityLength: {
        type: String,
        default: null,
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

  .chip-right {
    position: absolute;
    right: 10px;
    bottom: 20px;
    height: 34px;
    padding: 8px;
    font-size: 13px;
    background-color: rgba(0, 0, 0, 0.7);
    border-radius: 4px;
  }

  .chip-left {
    position: absolute;
    bottom: 20px;
    left: 10px;
    height: 34px;
    padding: 8px;
    font-size: 13px;
    background-color: rgba(0, 0, 0, 0.7);
    border-radius: 4px;
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
    .activity-length-chip {
      bottom: 20px;
    }
  }

</style>
