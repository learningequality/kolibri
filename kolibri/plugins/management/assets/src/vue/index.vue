<template>

  <core-base>
    <mgmt-nav slot="nav"></mgmt-nav>
    <user-roster slot="content"></user-roster>
  </core-base>

</template>


<script>

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'mgmt-nav': require('./mgmt-nav'),
      'user-roster': require('./user-roster'),
    },
    vuex: {
      actions: require('../actions.js'),
    },
  };

</script>


<style lang="stylus" scoped></style>
