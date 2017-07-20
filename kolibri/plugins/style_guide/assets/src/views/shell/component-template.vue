<template>

  <div class="component-template">

    <h1>{{ api.name }}</h1>

    <p>{{ api.description }}</p>

    <h2>Status</h2>
    <p v-if="status === 'complete'" class="status-complete">Fully implemented</p>
    <p v-else class="status-incomplete">Not fully implemented</p>

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

    <h2 id="examples">Examples</h2>
    <vuep :template="codeExamplesTemplate"/>


    <h2 id="guidelines">Guidelines</h2>
    <slot name="guidelines"/>

  </div>

</template>


<script>

  import tableOfContents from './table-of-contents';
  import escodegen from 'escodegen';
  import CamelCase from 'lodash/camelCase';

  export default {
    components: {
      tableOfContents,
    },
    props: {
      codeExamplesTemplate: {
        type: String,
        required: true,
      },
      api: {
        type: Object,
        required: true,
      },
      status: {
        type: String,
        default: 'incomplete',
        validator(value) {
          return ['complete', 'incomplete'].includes(value);
        },
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


<style lang="stylus">

  // NOT SCOPED

  @require '~vuep/dist/vuep.css'

  .vuep
    display: initial
    height: initial

    .vuep-preview, .vuep-editor
      width: 100%

    .vuep-preview
      padding: 0.5em

</style>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  @require '../../styles/style-guide.styl'

  .component-template
    margin-left: $sidenav-width
    padding: 2em
    line-height: 1.3em

    h1
      line-height: 1.7em

    h1, h2, h3
      color: #333

    h2, h3
      margin-top: 2em
      margin-bottom: 0.5em

    h4
      margin-bottom: 0.5em

    p
      margin-top: 0
      max-width: 50em

    ul
      margin-top: 0.5em

      li
        margin-bottom: 0.3em


    table, th, td
      border: 1px solid darkgray
      border-collapse: collapse

    th, td
      padding: 0.5em

    th
      background: #e0e0e0
      text-align: left

    code
      background: #fdf6e3
      color: #268bd2
      font-size: smaller
      padding: 4px

    .status-complete
      color: $core-status-correct

    .status-incomplete
      color: $core-status-wrong

</style>
