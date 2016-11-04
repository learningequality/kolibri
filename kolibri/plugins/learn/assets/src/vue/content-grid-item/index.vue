<template>

  <div>
    <grid-item v-link="link" :title="title" :kind="kind">
      <div class="thumbnail" :style="{ 'background-image': thumb }"></div>
    </grid-item>
  </div>

</template>


<script>

  const constants = require('../../state/constants');
  const PageNames = constants.PageNames;
  const PageModes = constants.PageModes;
  const getters = require('../../state/getters');

  module.exports = {
    components: {
      'grid-item': require('../card-grid/grid-item'),
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
            'topic',
          ].some(elem => elem === value);
        },
      },
      progress: {
        type: Number,
        required: true,
        default: 0.0,
        validator(value) {
          return (value >= 0.0) && (value <= 1.0);
        },
      },
    },
    computed: {
      link() {
        if (this.pageMode === PageModes.EXPLORE) {
          return {
            name: PageNames.EXPLORE_CONTENT,
            params: { id: this.id },
          };
        }
        return {
          name: PageNames.LEARN_CONTENT,
          params: { id: this.id },
        };
      },
      thumb() {
        if (this.thumbnail) {
          return `url(${this.thumbnail})`;
        }
        return '';
      },
    },
    vuex: {
      getters: {
        pageMode: getters.pageMode,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .thumbnail
    width: 100%
    height: 100%
    background-size: cover
    background-position: center
    background-color: black
    text-align: center
    position: relative

  .thumbnail:before
    content: ''
    display: inline-block
    vertical-align: middle
    height: 100%

</style>
