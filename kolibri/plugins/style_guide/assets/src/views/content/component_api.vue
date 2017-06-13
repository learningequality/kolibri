<template>

  <div>

    <h3>Require Path</h3>
    <p>{{ requirePath }}</p>

    <h3>Description</h3>
    <p>{{ api.description ? api.description : '-' }}</p>

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
          <td>{{ prop.value.required ? 'true' : 'false' }}</td>
          <td>{{ prop.value.default ? prop.value.default : '-' }}</td>
          <td>{{ prop.description ? prop.description : '-' }}</td>
        </tr>
      </table>
    </template>

    <template v-if="api.events.length">
      <h3>Emitted events</h3>
      <table>
        <tr>
          <th>Name</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
        <tr v-for="event in api.events">
          <td>{{ event.name }}</td>
          <td>{{ event.default ? event.default : '-' }}</td>
          <td>{{ event.description ? event.description : '-' }}</td>
        </tr>
      </table>
    </template>

    <template v-if="api.slots.length">
      <h3>Slots</h3>
      <table>
        <tr>
          <th>Name</th>
          <th>Description</th>
        </tr>
        <tr v-for="slot in api.slots">
          <td>{{ slot.name }}</td>
          <td>{{ slot.description ? slot.description : '-' }}</td>
        </tr>
      </table>
    </template>

  </div>

</template>


<script>

  /**
   * The programming API for the specific component: its require path, its description,
   * and tables storing a list of its props, events, and slots.
   */
  module.exports = {
    props: {
      /*
       * A JSON object returned from the vue-loader when parsing the specific component file.
       * Should correspond to require('!vue-loader!path/to/component/file').
       */
      api: {
        type: Object
      },
      /*
       * The path of the component to be used in a require statement if a developer
       * wished to use that require statement.
       */
      requirePath: {
        type: String
      }
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

  table,
  th,
  td
    border: 1px solid darkgray
    border-collapse: collapse

  th,
  td
    padding: 0.6em

  th
    background: #e0e0e0
    text-align: left

  h4
    font-weight: bold

</style>
