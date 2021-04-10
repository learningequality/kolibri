<template>

  <tr>
    <th dir="auto">
      <slot name="key">
        {{ keyText }}
      </slot>
    </th>
    <td>
      <slot name="value">
        {{ valueText }}
      </slot>
    </td>
  </tr>

</template>


<script>

  export default {
    name: 'HeaderTableRow',
    props: {
      keyText: {
        type: String,
        default: '',
      },
      valueText: {
        type: String,
        default: '',
      },
    },
  };

</script>


<style lang="scss" scoped>
  th,
  td {
    height: 2em;
    padding-right: 24px;
    font-size: 14px;
  }

</style>
