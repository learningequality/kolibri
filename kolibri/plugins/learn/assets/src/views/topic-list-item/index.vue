<template>

  <div>
    <list-item :link="link" :title="title" kind="topic"/>
  </div>

</template>


<script>

  const validateLinkObject = require('kolibri.utils.validateLinkObject');

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
        validator: validateLinkObject,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
