<template>

  <td>
    <elapsed-time :date="date" />
  </td>

</template>


<script>

  import elapsedTime from 'kolibri.coreVue.components.elapsedTime';

  export default {
    name: 'activityCell',
    components: { elapsedTime },
    props: {
      date: {
        type: Date,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  td
    text-align: left
    width: 150px

</style>
