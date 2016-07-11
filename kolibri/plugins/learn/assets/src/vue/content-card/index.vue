<template>

  <a v-link="link">
    <content-icon class="content-icon" v-if="kind" :kind="kind" :progress="progress"></content-icon>
    <img :src="thumbnail" class="thumbnail" v-if="showThumbnail">
    <div class="thumbnail" v-else>&nbsp;</div>
    <h3>
      {{ title }}
    </h3>

  </a>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;

  module.exports = {
    components: {
      'content-icon': require('../content-icon'),
    },
    props: {
      id: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      thumbnail: {
        type: String,
        required: true,
      },
      kind: {
        type: String,
        required: true,
        validator(value) {
          return [
            'audio',
            'video',
            'document',
            'exercise',
          ].some(elem => elem === value);
        },
      },
      progress: {
        type: String,
        required: true,
        validator(value) {
          return [
            'complete',
            'partial',
            'unstarted',
          ].some(elem => elem === value);
        },
      },
      showThumbnail: {
        // Add this as an option to show a truncated card.
        type: Boolean,
        default: true,
      },
    },
    computed: {
      link() {
        return {
          name: PageNames.EXPLORE_CONTENT,
          params: { id: this.id },
        };
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  $card-border-radius: 5px

  h4
    padding-left: 1rem
    padding-right: 1rem

  a
    box-sizing: border-box
    background-color: $core-bg-light
    margin-bottom: 1rem

  .thumbnail
    width: 100%

  .content-icon
    position: relative
    top: 1.6em
    left: 0.5em
    margin-top: -1em
    margin-bottom: -1em

</style>
