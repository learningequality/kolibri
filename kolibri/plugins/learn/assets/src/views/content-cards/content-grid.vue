<template>

  <div class="content-grid">
    <header v-if="header" class="content-grid-header">
      <h2> {{header}} </h2>
      <sub v-if="subheader"> {{subheader}} </sub>
    </header>
    <content-card
      class="content-card"
      v-for="content in contents"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind || 'topic'"
      :progress="content.progress"
      :link="content.kind ? genContentLink(content.id) : genTopicLink(content.id)"/>
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
      header: {
        type: String,
      },
      subheader: {
        type: String,
      }
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


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .content-card
    margin: 10px

</style>
