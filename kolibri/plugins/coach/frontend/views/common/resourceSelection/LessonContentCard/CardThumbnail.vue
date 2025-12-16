<template>

  <div
    :class="isMobile ? 'mobile-thumbnail-wrapper' : 'card-thumbnail-wrapper'"
    :style="thumbnailBackground"
  >
    <BookmarkIcon v-if="kind === 'bookmark'" />
    <ContentIcon
      v-if="!thumbnail"
      :kind="kind"
      class="thumbnail-icon"
      :style="{ color: $themeTokens.annotation }"
    />
  </div>

</template>


<script>

  import ContentIcon from 'kolibri-common/components/labels/ContentIcon';
  import { validateContentNodeKind } from 'kolibri/utils/validators';
  import BookmarkIcon from './BookmarkIcon';

  export default {
    name: 'CardThumbnail',
    components: {
      ContentIcon,
      BookmarkIcon,
    },
    props: {
      thumbnail: {
        type: String,
        default: null,
      },
      kind: {
        type: String,
        required: true,
        validator: validateContentNodeKind,
      },
      isMobile: {
        type: Boolean,
        required: true,
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
    position: absolute;
    width: $thumb-width;
    height: $thumb-height;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
  }

  .mobile-thumbnail-wrapper {
    position: absolute;
    left: 60px;
    width: $mobile-thumb-width;
    height: $mobile-thumb-height;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
  }

  .thumbnail-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(2);
  }

</style>
