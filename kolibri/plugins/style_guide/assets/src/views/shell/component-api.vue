<template>

  <div>
    <h1>{{ api.name }}</h1>
    <p>{{ api.description }}</p>
    <h2 id="api">API</h2>

    <h3>Import</h3>
    <code>import {{ camelCasedName }} from 'kolibri.coreVue.components.{{ camelCasedName }}';</code>

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
        <tr v-for="(prop, i) in api.props" :key="i">
          <td>{{ prop.name }}</td>
          <td><code>{{ parsePropType(prop.value.type) }}</code></td>
          <td><code>{{ parsePropRequired(prop.value.required) }}</code></td>
          <td>
            <code v-if="parsePropDefault(prop.value.type, prop.value.default)">
              {{ parsePropDefault(prop.value.type, prop.value.default) }}
            </code>
            <template v-else>-</template>
          </td>
          <td>{{ prop.description ? prop.description : '-' }}</td>
        </tr>
      </table>
    </template>

    <template v-if="api.events.length">
      <h3>Events</h3>
      <table>
        <tr>
          <th>Name</th>
          <th>Description</th>
        </tr>
        <tr v-for="(event, i) in api.events" :key="i">
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
        <tr v-for="(slot, i) in api.slots" :key="i">
          <td>{{ slot.name }}</td>
          <td>{{ slot.description ? slot.description : '-' }}</td>
        </tr>
      </table>
    </template>

  </div>

</template>


<script>

  import escodegen from 'escodegen';
  import CamelCase from 'lodash/camelCase';

  /**
   * The programming API for the specific component: its require path, its description,
   * and tables storing a list of its props, events, and slots.
   */
  export default {
    props: {
      /*
       * A JSON object returned from the vue-loader when parsing the specific component file.
       * Should correspond to the output of require('!vue-loader!path/to/component/file').
       */
      api: {
        type: Object,
      },
    },
    computed: {
      camelCasedName() {
        return CamelCase(this.api.name);
      },
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
        const stringfiedDefault = JSON.stringify(propDefault);
        if (stringfiedDefault) {
          return stringfiedDefault;
        }
        return null;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  code
    background: #fdf6e3
    color: #268bd2
    font-size: smaller
    padding: 4px

</style>
