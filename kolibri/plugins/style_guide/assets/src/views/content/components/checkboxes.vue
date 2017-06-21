<template>

  <component-style-guide
      class="checkbox-style-guide"
      :codeExamplesTemplate="codeExamplesTemplate"
      :api="api"
      :requirePath="requirePath"
    >

    <h1 slot="title">Checkboxes</h1>
    <p slot="summary">
      Use if you want to allow the user to select multiple items within a list.
      Actions should be selectable independently of each other.
    </p>

    <div slot="guidelines-and-usage">
      <h3>Usage</h3>
      <p>
        Use checkboxes in tables and lists only.
      </p>
      <p>
        Selected state of controls generally denote “positives” (yes/select/etc.)
      </p>

      <h3>Do not</h3>
      <ul>
        <li>
          Use checkboxes as a filter in a table or a list.
        </li>
        <li>
          Nest checkboxes.
        </li>
      </ul>

      <h3>Style</h3>
      <p>
        Kolibri utilizes the default styles + padding from Keen UI.
      </p>
      <p>
        Selected checkbox is the action color.
      </p>
      <p>
        Indeterminate checkbox is medium grey.
      </p>
      <p>
        Unselected checkbox are dark grey.
      </p>

      <h3>Language</h3>
      <h4>Labels & option text:</h4>
      <p>
        Keep these short, concise, and easy for the user to understand. Should not
        be structured as a sentence.
      </p>

      <h3>Layout</h3>
      <p>
        Checkboxes are always left-aligned.
      </p>
      <p>
        No inset padding, checkboxes left-align with the content of their
        container.
      </p>
      <p>
        Checkboxes are vertically stacked.
      </p>
    </div>

  </component-style-guide>

</template>


<script>

  // Globally register the Kolibri components to make them accessible in the
  // Vuep renderer. This has to be done on the compiler-included version of Vue
  // because that's what Vuep uses to dynamically render template.
  const FullVue = require('vue/dist/vue.common');
  FullVue.component('ui-checkbox', require('keen-ui/src/UiCheckbox'));

  // Define the examples as the initial content of the Vuep editor.
  // Notes: htmlhint would incorrectly warn about nested script tags, so we'd
  // need to work around it by dynamically constructing them.
  const script = 'script';
  const codeExamplesTemplate = `
<template>
  <div class="examples">
    <div class="example">
      <h4>Normal</h4>
      <ui-checkbox v-model="selected"></ui-checkbox>
      <ui-checkbox v-model="unselected"></ui-checkbox>
      <input type="checkbox" :indeterminate.prop="true">
    </div>

    <div class="example">
      <h4>Disabled</h4>
      <ui-checkbox :disabled="true" v-model="selected"></ui-checkbox>
      <ui-checkbox :disabled="true" v-model="unselected"></ui-checkbox>
    </div>
  </div>
</template>

<${script}>
  module.exports = {
    data: () => ({
      selected: true,
      unselected: false
    }),
    components: {
      // textbox: require('keen-ui/src/UiCheckbox')
    }
  };
</${script}>
`;

  module.exports = {
    components: {
      'component-style-guide': require('../../shell/component-style-guide'),
    },
    data: () => ({
      codeExamplesTemplate,
      api: require('!vue-doc!keen-ui/src/UiCheckbox'), // eslint-disable-line
      requirePath: 'keen-ui/src/UiCheckbox',
    })
  };

</script>


<style lang="stylus">

  .checkbox-style-guide
    .vuep-preview
      height: 20em

    .examples
      display: flex

      .example
        margin: 0 5em

</style>
