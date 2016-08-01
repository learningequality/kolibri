<template>

  <core-base>
    <user-roster></user-roster>
  </core-base>

</template>


<script>

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'user-roster': require('./user-roster.vue'),
    },
    vuex: {
      actions: require('../actions.js'),
    },
  };

</script>


<style lang="stylus" scoped></style>
