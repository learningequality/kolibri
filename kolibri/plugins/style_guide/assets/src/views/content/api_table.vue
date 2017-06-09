<template>

  <div>

    <h2>Name: {{ api.name }}</h2>
    <h2>Description: {{ api.description }}</h2>

    <div v-if="api.props.length">
      <h2>Props</h2>
      <table>
      <tr>
        <th>Name</th>
        <th>Type</th> 
        <th>Required</th>
        <th>Default</th>
        <th>Description</th>
      </tr>
      <tr v-for="prop in api.props">
        <td>{{ prop.name }}</td>
        <td>{{ prop.value.type }}</td>
        <td>{{ prop.required ? prop.required : 'No'}}</td>
        <td>{{ prop.value.default ? prop.value.default : 'None' }}</td>
        <td>{{ prop.description }}</td>
      </tr>
      </table>
    </div>

    <div v-if="api.events.length">
      <h2>Emitted events</h2>
      <table>
      <tr>
        <th>Name</th>
        <th>Type</th> 
        <th>Default</th>
        <th>Description</th>
      </tr>
      <tr v-for="event in api.events">
        <td>{{ event.name }}</td>
        <td>{{ event.type }}</td>
        <td>{{ event.default ? event.default : 'None' }}</td>
        <td>{{ event.description }}</td>
      </tr>
      </table>
    </div>

    <div v-if="api.slots.length">
      <h2>Slots</h2>
      <table>
      <tr>
        <th>Name</th>
        <th>Description</th>
      </tr>
      <tr v-for="slot in api.slots">
        <td>{{ slot.name }}</td>
        <td>{{ slot.description }}</td>
      </tr>
      </table>
    </div>

    <div v-if="api.methods.length">
      <h2>Methods</h2>
      <table>
      <tr>
        <th>Name</th>
        <th>Description</th>
      </tr>
      <tr v-for="method in api.methods">
        <td>{{ method.name }}</td>
        <td>{{ method.description }}</td>
      </tr>
      </table>
    </div>

  </div>

</template>


<script>

  module.exports = {
    props: {
      api: {
        type: Object,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  table, th, td
    border: 1px solid black
    border-collapse: collapse

  th, td
    padding: 15px

</style>
