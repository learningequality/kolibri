<template>

  <PageTemplate :componentName="api.name">
    <PageSection
      v-if="api.description"
      title="Description"
      anchor="#description"
    >
      <p v-if="api.description">
        {{ api.description }}
      </p>
    </PageSection>

    <PageSection
      v-if="api.props.length"
      title="Props"
      anchor="#props"
    >
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>Props</th>
            <th>Type</th>
            <th>Required</th>
            <th>Default</th>
            <th class="stretch">
              Description
            </th>
          </tr>
        </thead>
        <tbody slot="tbody">
          <tr v-for="(prop, i) in api.props" :key="i">
            <td><code>{{ prop.name }}</code></td>
            <td><code>{{ parsePropType(prop.value.type) }}</code></td>
            <td>
              <code v-if="parsePropRequired(prop.value.required) === 'true'">true</code>
              <template v-else>
                —
              </template>
            </td>
            <td>
              <code v-if="parsePropDefault(prop.value.type, prop.value.default)">
                {{ parsePropDefault(prop.value.type, prop.value.default) }}
              </code>
              <template v-else>
                —
              </template>
            </td>
            <td>{{ prop.description || '—' }}</td>
          </tr>
        </tbody>
      </CoreTable>
    </PageSection>

    <PageSection
      v-if="api.events.length"
      title="Events"
      anchor="#events"
    >
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>Events</th>
            <th class="stretch">
              Description
            </th>
          </tr>
        </thead>
        <tbody slot="tbody">
          <tr v-for="(event, i) in api.events" :key="i">
            <td><code>{{ event.name }}</code></td>
            <td>{{ event.description || '—' }}</td>
          </tr>
        </tbody>
      </CoreTable>
    </PageSection>

    <PageSection
      v-if="api.slots.length"
      title="Slots"
      anchor="#slots"
    >
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>Slots</th>
            <th class="stretch">
              Description
            </th>
          </tr>
        </thead>
        <tbody slot="tbody">
          <tr v-for="(slot, i) in api.slots" :key="i">
            <td><code>{{ slot.name }}</code></td>
            <td>{{ slot.description || '—' }}</td>
          </tr>
        </tbody>
      </CoreTable>
    </PageSection>

    <PageSection
      v-if="api.methods.length"
      title="Methods"
      anchor="#methods"
    >
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>Methods</th>
            <th class="stretch">
              Description
            </th>
          </tr>
        </thead>
        <tbody slot="tbody">
          <tr v-for="(method, i) in api.methods" :key="i">
            <td><code>{{ method.name }}</code></td>
            <td>{{ method.description || '—' }}</td>
          </tr>
        </tbody>
      </CoreTable>
    </PageSection>

  </PageTemplate>

</template>


<script>

  import escodegen from 'escodegen';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import PageTemplate from './PageTemplate';
  import PageSection from './PageSection';

  export default {
    name: 'ComponentDocs',
    components: {
      CoreTable,
      PageSection,
      PageTemplate,
    },
    computed: {
      api() {
        return this.$route.meta.componentAPI;
      },
    },
    methods: {
      parsePropType(propType) {
        if (!propType) {
          return 'null';
        }
        if (propType.type === 'ArrayExpression') {
          let arrayDescription = '';
          propType.elements.forEach((element, index) => {
            if (index !== 0) {
              arrayDescription += ', ';
            }
            arrayDescription += propType.elements[index].name;
          });
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
          return escodegen.generate(propDefault.body);
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
