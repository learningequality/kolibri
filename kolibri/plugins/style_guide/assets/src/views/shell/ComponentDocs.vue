<template>

  <div>

    <p v-if="api.description">{{ api.description }}</p>

    <p><code>{{ importString }}</code></p>

    <p v-if="api.props.length">
      Props:
      <table>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Required</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
        <tr v-for="(prop, i) in api.props" :key="i">
          <td><code>{{ prop.name }}</code></td>
          <td><code>{{ parsePropType(prop.value.type) }}</code></td>
          <td><code>{{ parsePropRequired(prop.value.required) }}</code></td>
          <td>
            <code v-if="parsePropDefault(prop.value.type, prop.value.default)">
              {{ parsePropDefault(prop.value.type, prop.value.default) }}
            </code>
            <template v-else>–</template>
          </td>
          <td>{{ prop.description || '–' }}</td>
        </tr>
      </table>
    </p>

    <p v-if="api.events.length">
      Events:
      <table>
        <tr>
          <th>Name</th>
          <th>Description</th>
        </tr>
        <tr v-for="(event, i) in api.events" :key="i">
          <td>{{ event.name }}</td>
          <td>{{ event.description || '–' }}</td>
        </tr>
      </table>
    </p>

    <p v-if="api.slots.length">
      Slots:
      <table>
        <tr>
          <th>Name</th>
          <th>Description</th>
        </tr>
        <tr v-for="(slot, i) in api.slots" :key="i">
          <td>{{ slot.name }}</td>
          <td>{{ slot.description || '–' }}</td>
        </tr>
      </table>
    </p>

    <p v-if="api.methods.length">
      Methods:
      <table>
        <tr>
          <th>Name</th>
          <th>Description</th>
        </tr>
        <tr v-for="(method, i) in api.methods" :key="i">
          <td><code>{{ method.name }}</code></td>
          <td>{{ method.description || '–' }}</td>
        </tr>
      </table>
    </p>

  </div>

</template>


<script>

  import escodegen from 'escodegen';
  import PascalCase from 'pascal-case';
  import logger from 'kolibri.lib.logging';

  const logging = logger.getLogger(__filename);

  export default {
    name: 'ComponentDocs',
    props: {
      api: {
        type: Object,
        required: true,
        validator(component) {
          if (!component.name) {
            logging.debug('Component does not have a name');
            return false;
          }
          if (!component.description) {
            logging.debug('Component does not have a description');
            return false;
          }
          return true;
        },
      },
    },
    computed: {
      importString() {
        return `import ${this.componentNamePascalCased} from 'kolibri.coreVue.components.${
          this.componentNamePascalCased
        }';`;
      },
      componentNamePascalCased() {
        return PascalCase(this.api.name);
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
        if (propDefault && propDefault.type === 'ArrowFunctionExpression') {
          return escodegen.generate(propDefault);
        }
        const stringfiedDefault = JSON.stringify(propDefault);
        if (stringfiedDefault) {
          return stringfiedDefault;
        }
        return null;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import '../../styles/style-guide';

  table,
  th,
  td {
    border-collapse: collapse;
    border: 1px solid darkgray;
  }

  th,
  td {
    padding: 0.5em;
  }

  th {
    text-align: left;
    background: #e0e0e0;
  }

</style>
