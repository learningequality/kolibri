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


<style lang="scss" scoped>

  td {
    width: 150px;
    text-align: left;
  }

</style>
