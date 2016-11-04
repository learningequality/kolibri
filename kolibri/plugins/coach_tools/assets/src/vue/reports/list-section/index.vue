<template>

  <div>

    <table>
      <thead>
        <tr>
          <th is="header-cell" text="Name"></th>
          <th is="header-cell" text="Exercise Progress"></th>
          <th is="header-cell" text="Content Progress"></th>
          <th is="header-cell" text="Last Activity"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="node in sortedData">
          <th scope="row">
            <item-cell :kind="node.kind" :title="node.title"></item-cell>
          </th>
          <td>
            <progress-cell :num="0.25" :isexercise="true"></progress-cell>
          </td>
          <td>
            <progress-cell :num="0.25" :isexercise="false"></progress-cell>
          </td>
          <td>
            <date-cell :date="node.last_active ? new Date(node.last_active) : null"></date-cell>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'header-cell': require('./header-cell'),
      'user-cell': require('./data-cells/user-cell'),
      'date-cell': require('./data-cells/date-cell'),
      'progress-cell': require('./data-cells/progress-cell'),
      'item-cell': require('./data-cells/item-cell'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  th, td
    padding: 10px

</style>
