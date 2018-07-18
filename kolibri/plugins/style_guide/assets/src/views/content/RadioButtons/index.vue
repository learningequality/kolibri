<template>

  <PageTemplate title="Radio Buttons" :completed="false">

    <h2><code>{{ kRadioButtonApi.name }}</code> API</h2>
    <ComponentDocs :api="kRadioButtonApi" />

    <h2>Code Example</h2>
    <VueExample :code="example" />

    <h2>Guidelines</h2>
    <h3>Usage</h3>
    <ul>
      <li>Should be used when all options must be visible. If not, use a select.</li>
      <li>Selected state of radio buttons should denote positives (yes/selected)</li>
      <li>Should not be used to filter tables or lists</li>
      <li>Should not be nested</li>
    </ul>

    <h3>Style</h3>
    <ul>
      <li>Always left-aligned</li>
      <li>Vertically stacked</li>
    </ul>

    <h3>Language</h3>
    <ul>
      <li>Labels should be short and concise. Should not be sentences.</li>
    </ul>

  </PageTemplate>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';

  import example from 'raw-loader!./example.html';
  import kRadioButtonApi from '!vue-doc!kolibri.coreVue.components.KRadioButton';

  FullVue.component('k-radio-button', KRadioButton);

  export default {
    name: 'RadioButtons',
    components: {
      PageTemplate,
      ComponentDocs,
      VueExample,
    },
    data: () => ({
      kRadioButtonApi,
      example,
    }),
  };

</script>


<style lang="scss" scoped></style>
