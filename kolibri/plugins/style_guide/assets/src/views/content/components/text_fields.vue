<template>

  <div>
    <h1>Textbox</h1>

    <h2>Examples and Code</h2>
    <vuep :template="codeExamplesTemplate"></vuep>

    <h2>API</h2>
    <component-api :api="api" :requirePath="requirePath"></component-api>
  </div>

</template>


<script>

  // Globally register the Kolibri components to make them accessible in the
  // Vuep renderer. This has to be done on the compiler-included version of Vue
  // because that's what Vuep uses to dynamically render template.
  const FullVue = require('vue/dist/vue.common');
  FullVue.component('textbox', require('kolibri.coreVue.components.textbox'));

  // Define the examples as the initial content of the Vuep editor.
  // Notes: htmlhint would incorrectly warn about nested script tags, so we'd
  // need to work around it by dynamically constructing them.
  const script = 'script';
  const codeExamplesTemplate = `
<template>
  <textbox v-model="value"/>
</template>

<${script}>
  module.exports = {
    data: () => ({ value: 'Example' }),
    components: {
      // textbox: require('kolibri.coreVue.components.textbox')
    }
  };
</${script}>
`;

  module.exports = {
    components: {
      'component-api': require('../../shell/component_api'),
      'table-of-contents': require('../../shell/table-of-contents'),
    },
    data: () => ({
      codeExamplesTemplate,
      api: require('!vue-doc!kolibri.coreVue.components.textbox'), // eslint-disable-line
      requirePath: 'kolibri.coreVue.components.textbox'
    })
  };

</script>


<style lang="stylus" scoped></style>
