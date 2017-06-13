<template>

  <div>
    <h1>Checkboxes</h1>
    <p>
      Use if you want to allow the user to select multiple items within a list.
      Actions should be selectable independently of each other.
    </p>

    <table-of-contents></table-of-contents>

    <h2 id="guidelines-and-usage">Guidelines & Usage</h2>

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
      Partially selected checkbox is medium grey.
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

    <h2 id="code-examples">Examples and Code</h2>
    <vuep class="code-examples" :template="codeExamplesTemplate"></vuep>

    <h2 id="api">API</h2>
    <component-api :api="api"></component-api>

  </div>

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
  <div class="checkbox_examples">
    <div class="checkbox_examples_section">
      <h4>Normal</h4>
      <ui-checkbox v-model="selected"></ui-checkbox>
      <ui-checkbox v-model="unselected"></ui-checkbox>
      <input type="checkbox" :indeterminate.prop="true">
    </div>

    <div class="checkbox_examples_section">
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

<style scoped>
  .checkbox_examples {
    display: flex;
  }
  .checkbox_examples_section {
    margin: 0 5em;
  }
</style>
`;

  const api = require('!vue-doc!keen-ui/src/UiCheckbox'); // eslint-disable-line

  module.exports = {
<<<<<<< HEAD
    components: {
      'component-api': require('../component_api'),
    },
    data: () => ({
      codeExamplesTemplate,
      api
    })
=======
    data: () => ({ codeExamplesTemplate }),
    components: {
      'table-of-contents': require('../../shell/table-of-contents'),
    },
>>>>>>> chao/add_toc_and_fix_bugs
  };

</script>


<style lang="stylus" scoped>

  .code-examples
    height: 530px

</style>
