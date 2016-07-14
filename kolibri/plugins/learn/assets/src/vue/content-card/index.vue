<template>

  <a class='root' v-link="link">
    <div class='thumb-wrapper'>
      <content-icon
        class="content-icon"
        v-if="kind"
        :kind="kind"
        :progress="progress">
      </content-icon>
      <div class='thumbnail' :style='{ "background-image": thumb }'></div>
    </div>
    <div class='text'>
      {{ title }}
    </div>

  </a>

</template>


<script>

  const constants = require('../../state/constants');
  const PageNames = constants.PageNames;
  const PageModes = constants.PageModes;
  const getters = require('../../state/getters');

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
        const url = this.thumbnail ? this.thumbnail : require(`./images/default_thumbnail.png`);
        return `url(${url})`;
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
  @require '../learn.styl'

  $thumb-width = $card-height * 3.0 / 2.5;

  .root
    display: block
    width: $card-width
    height: $card-height
    background-color: $core-bg-light
    // margin-bottom: 1rem
    overflow: hidden

  .thumb-wrapper
    position: relative
    display: block
    float: left
    width: $thumb-width
    height: $card-height

  .text
    display: block
    float: right
    width: $card-width - $thumb-width
    height: $card-height
    padding: 0.5em
    font-size: 0.8rem
    font-weight: bold


  /* child elements */

  .thumbnail
    width: $thumb-width
    height: $card-height
    background-size: cover
    background-position: center

  .content-icon
    position: absolute
    top: 0.5em
    left: 0.5em

</style>
