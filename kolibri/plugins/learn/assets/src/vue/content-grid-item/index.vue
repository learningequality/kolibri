<template>

  <div>
    <grid-item v-link="link" :title="title">
      <div class="thumbnail" :style="{ 'background-image': thumb }">
        <content-icon
          class="content-icon-center"
          v-if="kind"
          :size="60"
          :kind="kind"
          :progress="progress">
        </content-icon>
      </div>
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
      'content-icon': require('../content-icon'),
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

  @require '~core-theme.styl'

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

  .content-icon-center
    display: inline-block
    vertical-align: middle
    position: absolute
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
    width: 60px
    height: 60px

</style>
