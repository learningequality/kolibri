<template>

  <tr>
    <th><slot name="key"></slot></th>
    <td><slot name="value"></slot></td>
  </tr>

</template>


<script>

  export default {
    name: 'HeaderTableRow',
  };

</script>


<style lang="scss" scoped>

  th {
    text-align: left;
  }

  th,
  td {
    height: 2em;
    padding-right: 24px;
    font-size: 14px;
  }

  td {
    width: 100%;
  }

</style>
