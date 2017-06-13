<template>

  <div>

    <p><b>Name:</b> {{ api.name }}</p>
    <p><b>Description:</b> {{ api.description }}</p>

    <template v-if="api.props.length">
      <h3>Props</h3>
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
          <td>{{ parseType(prop.value.type) }}</td>
          <td>{{ prop.value.required }}</td>
          <td>{{ prop.value.default ? prop.value.default : '-' }}</td>
          <td>{{ prop.description }}</td>
        </tr>
      </table>
    </template>

    <template v-if="api.props.length">
      <h3>Emitted events</h3>
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
          <td>{{ event.default ? event.default : '-' }}</td>
          <td>{{ event.description }}</td>
        </tr>
      </table>
    </template>

    <template v-if="api.props.length">
      <h3>Slots</h3>
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
    </template>

    <template v-if="api.props.length">
      <h3>Methods</h3>
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
    </template>

  </div>

</template>


<script>

  module.exports = {
    props: {
      api: {
        type: Object,
      },
    },
    methods: {
      parseType(type) {
        if (!type) {
          return 'null';
        }
        if (type.type === 'ArrayExpression') {
          let arrayType = '[';
          type.elements.forEach((element, index) => {
            if (index !== 0) {
              arrayType += ', ';
            }
            arrayType += type.elements[index].name;
          });
          arrayType += ']';
          return arrayType;
        }
        return type;
      }
    }
  };

</script>


<style lang="stylus" scoped>

  table, th, td
    border: 1px solid darkgray
    border-collapse: collapse

  th, td
    padding: 0.6em

  th
    background: #e0e0e0
    text-align: left

</style>
