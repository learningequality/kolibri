<template>

  <div
    class="card-thumbnail-wrapper"
    :style="thumbnailBackground"
  >

    <CornerIcon :kind="kind" />

    <ContentIcon
      v-if="!thumbnail"
      :kind="kind"
      class="thumbnail-icon"
      :style="{ color: $themeTokens.annotation }"
    />

  </div>

</template>


<script>

  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import { validateContentNodeKind } from 'kolibri.utils.validators';
  import CornerIcon from './CornerIcon';

  export default {
    name: 'CardThumbnail',
    components: {
      ContentIcon,
      CornerIcon,
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

  .thumbnail-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(2);
  }

</style>
