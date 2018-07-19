<template>

  <td>
    <ElapsedTime :date="date" />
  </td>

</template>


<script>

  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';

  export default {
    name: 'ActivityCell',
    components: { ElapsedTime },
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
