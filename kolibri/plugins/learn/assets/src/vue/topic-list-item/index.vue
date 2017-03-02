<template>

  <div>
    <list-item :link="link" :title="title" kind="topic"/>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'list-item': require('../card-list/list-item'),
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      link: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
