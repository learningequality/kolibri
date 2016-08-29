<template>

  <div>
    <list-item v-link="link" :title="title">
      <div class="thumbnail"></div>
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
      title: {
        type: String,
        required: true,
      },
    },
    computed: {
      link() {
        return {
          name: constants.PageNames.EXPLORE_TOPIC,
          params: { id: this.id },
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
    background-position: center
    background-image: url(../icons/folder.svg)
    background-repeat: no-repeat
    // chosen to approximage ~0.5em - the card's internal padding
    background-size: 78%
    margin-left: 10%

</style>
