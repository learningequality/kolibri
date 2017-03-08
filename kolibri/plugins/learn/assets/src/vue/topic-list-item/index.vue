<template>

  <div>
    <list-item :link="link" :title="title" kind="topic"/>
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


<style lang="stylus" scoped></style>
