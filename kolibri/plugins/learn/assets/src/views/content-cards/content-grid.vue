<template>

  <div>
    <content-card
      class="content-card"
      v-for="content in contents"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind || 'topic'"
      :progress="content.progress"
      :link="item.kind ? genContentLink(item.id) : genTopicLink(item.id)"/>
  </div>

</template>


<script>

  const PageNames = require('../../constants').PageNames;

  module.exports = {
    props: {
      contents: {
        type: Array,
        required: true,
      },
    },
    components: {
      'content-card': require('./content-card'),
    },
    methods: {
      genContentLink(id) {
        return {
          name: PageNames.LEARN_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
      genTopicLink(id) {
        return {
          name: PageNames.EXPLORE_TOPIC,
          params: { channel_id: this.channelId, id },
        };
      },
    },
    vuex: {
      getters: {
        channelId: (state) => state.core.channels.currentId,
      },
    }
  };

</script>


<style>

  @require '~kolibri.styles.definitions'

  .content-card
    margin-left: 10px
    margin-right: 10px

</style>
