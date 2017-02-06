<template>

  <div>
    <list-item :link="link" :title="title">
      <div class="thumbnail">
        <content-icon kind="topic"/>
      </div>
    </list-item>
  </div>

</template>


<script>

  const constants = require('../../state/constants');

  module.exports = {
    components: {
      'list-item': require('../card-list/list-item'),
    },
    props: {
      id: {
        type: String,
        required: true,
      },
      channelId: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
    },
    computed: {
      link() {
        return {
          name: constants.PageNames.EXPLORE_TOPIC,
          params: { channel_id: this.channelId, id: this.id },
        };
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .thumbnail
    position: relative
    width: 60%
    height: 100%
    margin-left: 10%

</style>
