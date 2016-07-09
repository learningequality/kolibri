<template>

  <a v-link="link">
    <img class="topic-card-folder" class="thumbnail" src="./folder.svg">
    <h3 class="title">
      {{ title }}
    </h3>
  </a>

</template>


<script>

  const constants = require('../../constants');

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


<style lang="stylus" scoped></style>
