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
    width: 50%;
    padding-right: 8px;
    padding-bottom: 8px;
    font-size: 14px;
  }

</style>
