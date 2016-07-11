<template>

  <div class="search-card" v-link="link">
    <div class="header">
      <img class="content-icon" v-if="kind === 'topic'" src="../folder.svg">
      <content-icon class="content-icon" v-else :kind="kind" :progress="progress"></content-icon>
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

  const PageNames = require('../../state/constants').PageNames;

  module.exports = {
    components: {
      'content-icon': require('../content-icon'),
    },
    computed: {
      link() {
        if (this.kind === 'topic') {
          return {
            name: PageNames.EXPLORE_TOPIC,
            params: { id: this.id },
          };
        }
        return {
          name: PageNames.EXPLORE_CONTENT,
          params: { id: this.id },
        };
      },
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
      description: {
        type: String,
        required: true,
      },
      thumbnail: {
        default: '',
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
        default: 'topic',
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
    border: 2px solid transparent
  .search-card:hover
    border: 2px solid $core-action-light

  .header
    margin-top: 8px
  .content-icon
    width: 10%
    vertical-align:middle
    display: inline-block
  h4
    width: 80%
    margin-left: 8px
    margin-right: 8px
    margin-top: 0
    margin-bottom: 0
    color: $core-action-normal
    display: inline-flex

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
    margin-top: 5px

</style>
