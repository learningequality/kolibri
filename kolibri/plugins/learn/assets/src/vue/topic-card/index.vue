<template>

  <div>
    <card v-link="link" :title="title">
      <div class="thumbnail"></div>
    </card>
  </div>

</template>


<script>

  const constants = require('../../state/constants');

  module.exports = {
    components: {
      card: require('../card'),
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
    width: 100%
    height: 100%
    background-position: center
    background-image: url(../icons/folder.svg)
    background-repeat: no-repeat
    // chosen to approximage ~0.5em - the card's internal padding
    background-size: 78%

</style>
