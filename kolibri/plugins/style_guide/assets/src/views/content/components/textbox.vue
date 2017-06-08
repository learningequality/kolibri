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
  // Notes: htmllint would incorrectly warn about nested script tags, so we'd
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
    data: () => ({ codeExamplesTemplate })
  };

</script>


<style lang="stylus" scoped></style>
