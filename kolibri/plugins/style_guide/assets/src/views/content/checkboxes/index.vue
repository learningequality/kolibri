<template>

  <page-template title="Checkboxes" :completed="false">

    <h2><code>{{ kCheckboxApi.name }}</code> API</h2>
    <component-docs :api="kCheckboxApi" />

    <h2>Code Example</h2>
    <vue-example :code="example" />

    <h2>Guidelines</h2>
    <h3>Usage</h3>
    <ul>
      <li>Should only be used in tables and lists</li>
      <li>Selected state of checkboxes should denote positives (yes/select/)</li>
      <li>Should not be used as filters in tables or lists</li>
      <li>Should not be nested</li>

    </ul>

    <h3>Style</h3>
    <ul>
      <li>Selected state is the action color</li>
      <li>Indeterminate state is medium grey</li>
      <li>Unselected state are dark grey</li>
      <li>Disabled state is </li>
      <li>Always left-aligned</li>
      <li>vertically stacked</li>
    </ul>

    <h3>Language</h3>
    <ul>
      <li>Labels should be short and concise. Should not be sentences.</li>
    </ul>

  </page-template>

</template>


<script>

  import componentDocs from '../../shell/component-docs';
  import vueExample from '../../shell/vue-example';
  import pageTemplate from '../../shell/page-template';

  import example from 'raw-loader!./example.html';
  import kCheckboxApi from '!vue-doc!kolibri.coreVue.components.kCheckbox';

  import FullVue from 'vue/dist/vue.common';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  FullVue.component('k-checkbox', kCheckbox);

  export default {
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
    },
    data: () => ({
      kCheckboxApi,
      example,
    }),
  };

</script>


<style lang="stylus" scoped></style>
