<template>

  <core-base>
    <learner-roster></learner-roster>
  </core-base>

</template>


<script>

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'drop-down': require('./drop-down.vue'),
      'learner-roster': require('./learner-roster.vue'),
    },
    vuex: {
      actions: require('../actions.js'),
    },
  };

</script>


<style lang="stylus" scoped></style>
