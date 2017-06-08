<template>

  <div>

    <h2>Name: {{ componentApi.name }}</h2>
    <table>
    <tr>
      <th>Property</th>
      <th>Description</th> 
      <th>Type</th> 
      <th>Required?</th>
      <th>Default</th>
    </tr>
    <tr>
      <td>name</td>
      <td>The name of the instance of this component.</td> 
      <td>String</td>
      <td>true</td>
      <td>n/a</td>
    </tr>
    <tr>
      <td>options</td>
      <td>List of options to display.</td> 
      <td>Array</td>
      <td>true</td>
      <td>n/a</td>
    </tr>
    <tr>
      <td>color</td>
      <td>Color it should be.</td> 
      <td>String</td>
      <td>false</td>
      <td>"primary"</td>
    </tr>
    </table>

    <h2>{{ componentApi }}</h2>

  </div>

</template>

<script>

  module.exports = {
    components: {
    },
    props: {
        componentApi: {
          type: Object,
        },
    },

    data: () => ({
    })
  }

</script>

<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  table, th, td
    border: 1px solid black
    border-collapse: collapse

  th, td
    padding: 15px

</style>
