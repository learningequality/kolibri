<template>

  <div>
    Textbox

    <vuep :template="codeExamplesTemplate"></vuep>
  </div>

</template>


<script>

  // Globally register the Kolibri components to make them accessible in the
  // Vuep renderer. This has to be done on the compiler-included version of Vue
  // because that's what Vuep uses to dynamically render template.
  const FullVue = require('vue/dist/vue.common');
  FullVue.component('textbox', require('kolibri.coreVue.components.textbox'));

  // Define the examples as the initial content of the Vuep editor.
  const codeExamplesTemplate = `
const examples = \`
  <!-- require('kolibri.coreVue.components.textbox') -->
  <textbox v-model="value"/>
\`;

module.exports = {
  template: '<div>' + examples + '</div>',
  data: () => ({ value: 'Example' })
}
`;

  module.exports = {
    data: () => ({ codeExamplesTemplate })
  };

</script>


<style lang="stylus" scoped></style>
