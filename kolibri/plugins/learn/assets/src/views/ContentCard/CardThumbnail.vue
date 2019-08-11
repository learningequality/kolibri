<template>

  <div
    class="card-thumbnail-wrapper"
    :class="{ 'mobile-thumbnail' : isMobile }"
    :style="thumbnailBackground"
  >

    <ContentIcon
      v-if="!thumbnail"
      :kind="kind"
      class="type-icon"
      :style="{ color: $themeTokens.annotation }"
    />

    <ProgressIcon
      v-if="progress > 0"
      class="progress-icon"
      :progress="progress"
    />

    <div
      v-if="showContentIcon"
      class="content-icon-wrapper"
    >
      <svg
        height="64"
        width="64"
        viewBox="0 0 64 64"
        class="content-icon-bg"
        :style="contentIconBgColor"
      >
        <polygon
          stroke-width="0"
          :points="contentIconBgCoords"
        />
      </svg>
      <ContentIcon
        :kind="kind"
        :showTooltip="true"
        class="content-icon"
        :style="{ color: $themeTokens.textInverted }"
      />
    </div>

    <div
      v-if="progress!==undefined"
      class="progress-bar-wrapper"
      :style="{ backgroundColor: $themePalette.grey.v_200 }"
    >
      <div
        class="progress-bar"
        :style="{
          width: `${progress * 100}%`,
          backgroundColor: isMastered ?
            $themeTokens.mastered : (isInProgress ? $themeTokens.progress : ''),
        }"
      >
      </div>
    </div>

  </div>

</template>


<script>

  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import { validateContentNodeKind } from 'kolibri.utils.validators';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'CardThumbnail',
    components: {
      ContentIcon,
      ProgressIcon,
    },
    props: {
      thumbnail: {
        type: String,
        required: false,
      },
      kind: {
        type: String,
        required: true,
        validator: validateContentNodeKind,
      },
      // If true, shows the content icon on the upper left of the thumbnail
      showContentIcon: {
        type: Boolean,
        default: true,
      },
      progress: {
        type: Number,
        required: false,
        default: 0.0,
        validator(value) {
          return value >= 0.0 && value <= 1.0;
        },
      },
      isMobile: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      isMastered() {
        return this.progress === 1;
      },
      isInProgress() {
        return this.progress > 0 && this.progress < 1;
      },
      thumbnailBackground() {
        return {
          backgroundColor: this.$themeTokens.surface,
          backgroundImage: this.thumbnail ? `url('${this.thumbnail}')` : '',
        };
      },
      contentIconBgCoords() {
        const topLeft = '0,0';
        const topRight = '64,0';
        const bottomLeft = '0,64';
        const bottomRight = '64,64';
        if (this.isRtl) {
          return `${topLeft} ${topRight} ${bottomRight}`;
        }
        return `${topLeft} ${topRight} ${bottomLeft}`;
      },
      contentIconBgColor() {
        switch (this.kind) {
          case ContentNodeKinds.EXERCISE:
            return { fill: this.$themeTokens.exercise };
          case ContentNodeKinds.VIDEO:
            return { fill: this.$themeTokens.video };
          case ContentNodeKinds.AUDIO:
            return { fill: this.$themeTokens.audio };
          case ContentNodeKinds.DOCUMENT:
            return { fill: this.$themeTokens.document };
          case ContentNodeKinds.HTML5:
            return { fill: this.$themeTokens.html5 };
          case ContentNodeKinds.SLIDESHOW:
            return { fill: this.$themeTokens.slideshow };
          default:
            return { fill: this.$themeTokens.topic };
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './card';

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
