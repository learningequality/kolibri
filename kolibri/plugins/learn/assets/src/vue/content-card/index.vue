<template>

  <a v-link="link">
    <img class="content-icon" v-if="kind" :src="icon">
    <img :src="thumbnail" class="thumbnail">
    <h3>
      {{ title }}
    </h3>

  </a>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;

  module.exports = {
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
    },
    computed: {
      icon() {
        // Note: dynamic requires should be used carefully because
        //  they greedily add items to the webpack bundle.
        // See https://webpack.github.io/docs/context.html
        return require(`./content-icons/${this.progress}-${this.kind}.svg`);
      },
      link() {
        return {
          name: PageNames.EXPLORE_CONTENT,
          params: { id: this.id },
        };
      },
    },
    vuex: {
      actions: require('../../actions'),
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
