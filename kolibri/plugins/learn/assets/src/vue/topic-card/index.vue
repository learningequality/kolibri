<template>

  <a v-link="{ name: $options.PageNames.EXPLORE_TOPIC, params: { id: id } }">
    <img class="topic-card-folder" class="thumbnail" src="./folder.svg">
    <h3 class="title">
      {{ title }}
    </h3>
  </a>

</template>


<script>

  const constants = require('../../constants');

  module.exports = {
    mixins: [constants], // makes constants available in $options
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
  };

</script>


<style lang="stylus" scoped></style>
