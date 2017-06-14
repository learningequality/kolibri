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
          <td>{{ parsePropType(prop.value.type) }}</td>
          <td>{{ parsePropRequired(prop.value.required) }}</td>
          <td>{{ parsePropDefault(prop.value.type, prop.value.default) }}</td>
          <td>{{ prop.description ? prop.description : '-' }}</td>
        </tr>
      </table>
    </template>

    <template v-if="api.events.length">
      <h3>Emitted events</h3>
      <table>
        <tr>
          <th>Name</th>
          <th>Description</th>
        </tr>
        <tr v-for="event in api.events">
          <td>{{ event.name }}</td>
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

  const escodegen = require('escodegen');

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
      parsePropType(propType) {
        if (!propType) {
          return 'null';
        }
        if (propType.type === 'ArrayExpression') {
          let arrayDescription = '[';
          propType.elements.forEach((element, index) => {
            if (index !== 0) {
              arrayDescription += ', ';
            }
            arrayDescription += propType.elements[index].name;
          });
          arrayDescription += ']';
          return arrayDescription;
        }
        return propType;
      },
      parsePropRequired(propRequired) {
        if (!propRequired) {
          return 'false';
        }
        if (propRequired === true) {
          return 'true';
        }
        return escodegen.generate(propRequired);
      },
      parsePropDefault(propType, propDefault) {
        if (!propDefault) {
          return '-';
        }
        if (propType === 'String') {
          return JSON.stringify(propDefault);
        }
        if (propDefault.type) {
          return escodegen.generate(propDefault);
        }
        return propDefault;
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
