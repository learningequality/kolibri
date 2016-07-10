<template>

  <div class="search-card" v-link="{ name: 'explore-content', params: {content_id: id} }">
    <div class="header">
      <img class="content-icon" v-if="kind" :src="icon">
      <h4>
        {{ title }}
      </h4>
    </div>
    <p class="description">
      {{ description }}
    </p>
  </div>

</template>


<script>

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
      description: {
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
            'topic',
          ].some(elem => elem === value);
        },
      },
      progress: {
        type: String,
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
        if (this.kind === 'topic') {
          return require(`./content-icons/${this.kind}.svg`);
        }
        return require(`./content-icons/${this.progress}-${this.kind}.svg`);
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
  
  .search-card
    margin-left: 15px
    margin-right: 5px
    margin-top: 5px
    margin-bottom: 5px
    background-color: $core-bg-light
    padding: 2px 16px
    border-radius: 4px
    cursor: pointer
  
  .header
    margin-top: 8px
  .content-icon
    width: 10%
    vertical-align:middle
  h4
    width: 80%
    margin-left: 8px
    margin-right: 8px
    margin-top: 0
    margin-bottom: 0
    color: $core-action-normal
    display: inline-flex
  a
    box-sizing: border-box
    margin-bottom: 1rem
  .description
    color: $core-text-default
    font-size: 12px
    overflow: hidden
    text-overflow: ellipsis
    display: -webkit-box
    line-height: 16px /* fallback */
    max-height: 48px /* fallback */
    -webkit-line-clamp: 3 /* number of lines to show */
    -webkit-box-orient: vertical

</style>
