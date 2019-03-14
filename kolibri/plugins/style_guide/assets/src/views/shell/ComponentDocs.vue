<template>

  <div>

    <h3>Description</h3>
    <p v-if="api.description"> {{ api.description }}</p>

    <template v-if="api.props.length">
      <h3>Props</h3>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>Props</th>
            <th>Type</th>
            <th>Required</th>
            <th>Default</th>
            <th class="stretch">Description</th>
          </tr>
        </thead>
        <tbody slot="tbody">
          <tr v-for="(prop, i) in api.props" :key="i">
            <td><code>{{ prop.name }}</code></td>
            <td><code>{{ parsePropType(prop.value.type) }}</code></td>
            <td>
              <code v-if="parsePropRequired(prop.value.required) === 'true'">true</code>
              <template v-else>—</template>
            </td>
            <td>
              <code v-if="parsePropDefault(prop.value.type, prop.value.default)">
                {{ parsePropDefault(prop.value.type, prop.value.default) }}
              </code>
              <template v-else>—</template>
            </td>
            <td>{{ prop.description || '—' }}</td>
          </tr>
        </tbody>
      </CoreTable>
    </template>

    <template v-if="api.events.length" hideTop>
      <h3>Events</h3>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>Events</th>
            <th class="stretch">Description</th>
          </tr>
        </thead>
        <tbody slot="tbody">
          <tr v-for="(event, i) in api.events" :key="i">
            <td><code>{{ event.name }}</code></td>
            <td>{{ event.description || '—' }}</td>
          </tr>
        </tbody>
      </CoreTable>
    </template>

    <template v-if="api.slots.length" hideTop>
      <h3>Slots</h3>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>Slots</th>
            <th class="stretch">Description</th>
          </tr>
        </thead>
        <tbody slot="tbody">
          <tr v-for="(slot, i) in api.slots" :key="i">
            <td><code>{{ slot.name }}</code></td>
            <td>{{ slot.description || '—' }}</td>
          </tr>
        </tbody>
      </CoreTable>
    </template>

    <template v-if="api.methods.length" hideTop>
      <h3>Methods</h3>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>Methods</th>
            <th class="stretch">Description</th>
          </tr>
        </thead>
        <tbody slot="tbody">
          <tr v-for="(method, i) in api.methods" :key="i">
            <td><code>{{ method.name }}</code></td>
            <td>{{ method.description || '—' }}</td>
          </tr>
        </tbody>
      </CoreTable>
    </template>

  </div>

</template>


<script>

  import escodegen from 'escodegen';
  import PascalCase from 'pascal-case';
  import logger from 'kolibri.lib.logging';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';

  const logging = logger.getLogger(__filename);

  export default {
    name: 'ComponentDocs',
    components: {
      CoreTable,
    },
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

  th {
    min-width: 50px;
  }

  .stretch {
    width: 100%;
    min-width: 150px;
  }

</style>
