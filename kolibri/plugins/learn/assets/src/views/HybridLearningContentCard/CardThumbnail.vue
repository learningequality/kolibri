<template>

  <div
    class="card-thumbnail-wrapper"
    :class="{ 'mobile-thumbnail': isMobile }"
    :style="thumbnailBackground"
  >
    <LearningActivityDuration
      v-if="!isMobile"
      :contentNode="contentNode"
      appearance="chip"
      class="duration"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import LearningActivityDuration from '../LearningActivityDuration';

  export default {
    name: 'CardThumbnail',
    components: {
      LearningActivityDuration,
    },
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
      contentNode: {
        type: Object,
        required: true,
      },
    },
    computed: {
      thumbnailBackground() {
        return {
          backgroundColor: this.$themePalette.grey.v_200,
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
    height: $thumb-height-desktop-hybrid-learning;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
  }
  .content-icon-wrapper {
    position: absolute;
    width: 56px;
    height: 56px;
  }
  .duration {
    position: absolute;
    bottom: 16px;
    left: 10px;
  }

  /* MOBILE OVERRIDES */
  .mobile-thumbnail.card-thumbnail-wrapper {
    width: 100%;
    height: $thumb-height-mobile-hybrid-learning;
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
