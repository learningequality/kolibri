<template>

  <div class="search-card">
    <div class="header">
      <topic-card v-if="topic"
      :id="id"
      :title="title"
      :description="description">
      </topic-card>
      <content-card v-else
      :id="id"
      :title="title"
      :description="description"
      :thumbnail="thumbnail"
      :kind="kind"
      :progress="progress"
      :show-thumbnail="false">
      </content-card>
    </div>
    <p class="description">
      {{ description }}
    </p>
  </div>

</template>


<script>

  module.exports = {
    components: {
      topicCard: require('../topic-card'),
      contentCard: require('../content-card'),
    },
    computed: {
      topic() {
        return this.kind === 'topic';
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
  
  .header
    margin-top: 8px

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
