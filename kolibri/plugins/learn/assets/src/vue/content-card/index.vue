<template>

  <div>
    <card v-link="link" :title="title">
      <div class="thumbnail" :class="{ 'thumbnail-center' : !thumb }" :style="{ 'background-image': thumb }">
        <content-icon
          :class="thumb ? 'content-icon' : 'content-icon-center' "
          v-if="kind"
          :kind="kind"
          :progress="progress">
        </content-icon>
      </div>
    </card>
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
      'card': require('../card'),
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
        return ``;
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

  .thumbnail-center
    text-align: center

  .thumbnail-center:before
    content: ''
    display: inline-block
    vertical-align: middle
    height:100%

  .content-icon
    position: absolute
    top: 0.5em
    left: 0.5em

  .content-icon-center
    width: 70%
    display: inline-block
    vertical-align: middle

</style>
