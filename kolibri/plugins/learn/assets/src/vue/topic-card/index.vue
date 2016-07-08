<template>

  <a v-link="{ name: 'explore-topic-page', params: {content_id: id} }">
      <img class="topic-card-folder" class="thumbnail" src="./folder.svg">
      <h3 class="title">
        {{ title }}
      </h3>
  </a>

</template>


<script>

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
  };

</script>


<style lang="stylus" scoped></style>
