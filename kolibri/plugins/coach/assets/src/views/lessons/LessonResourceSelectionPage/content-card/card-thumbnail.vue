<template>

  <div
    class="card-thumbnail-wrapper"
    :style="thumbnailBackground"
  >

    <content-icon
      v-if="!thumbnail"
      :kind="kind"
      class="thumbnail-icon"
    />

    <div class="content-icon-wrapper">
      <svg
        height="64"
        width="64"
        viewBox="0 0 64 64"
        class="content-icon-bg"
        :style="contentIconBgColor"
      >
        <polygon stroke-width="0" :points="contentIconBgCoords" />
      </svg>
      <content-icon
        :kind="kind"
        :showTooltip="true"
        class="content-icon"
      />
    </div>

  </div>

</template>


<script>

  import contentIcon from 'kolibri.coreVue.components.contentIcon';
  import { validateContentNodeKind } from 'kolibri.utils.validators';

  export default {
    name: 'cardThumbnail',
    components: {
      contentIcon,
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
        if (this.thumbnail) {
          return { backgroundImage: `url('${this.thumbnail}')` };
        }
        return {};
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
        if (this.kind === 'exercise') {
          return { fill: '#0eafaf' };
        } else if (this.kind === 'video') {
          return { fill: '#3938A5' };
        } else if (this.kind === 'audio') {
          return { fill: '#E65997' };
        } else if (this.kind === 'document') {
          return { fill: '#ED2828' };
        } else if (this.kind === 'topic') {
          return { fill: '#262626' };
        } else if (this.kind === 'html5') {
          return { fill: '#FF8B41' };
        }
        return {};
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  @require './card.styl'

  .card-thumbnail-wrapper
    position: absolute
    background-size: contain
    background-repeat: no-repeat
    background-position: center
    background-color: $core-bg-light
    width: $thumb-width
    height: $thumb-height

  .thumbnail-icon
    position: absolute
    transform: translate(-50%, -50%) scale(2)
    top: 50%
    left: 50%
    color: $core-text-annotation

  .content-icon-wrapper
    position: absolute
    width: 48px
    height: 48px

  .content-icon
    position: absolute
    color: white
    transform: translate(25%, 0)
    font-size: 18px

  .content-icon-bg
    position: absolute
    width: 100%
    height: 100%
    fill-opacity: 0.9

</style>
