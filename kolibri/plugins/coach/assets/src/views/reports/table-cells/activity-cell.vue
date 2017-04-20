<template>

  <td>
    <elapsed-time :date="date" />
  </td>

</template>


<script>

  module.exports = {
    components: {
      'elapsed-time': require('kolibri.coreVue.components.elapsedTime'),
    },
    props: ['date'],
  };

</script>


<style lang="stylus" scoped>

  td
    text-align: left
    width: 150px

</style>
