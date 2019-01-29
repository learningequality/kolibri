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
    font-weight: normal;
    text-align: left;
  }

  th,
  td {
    width: 50%;
    line-height: 1.5em;
  }

</style>
