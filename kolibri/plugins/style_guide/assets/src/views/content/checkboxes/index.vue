<template>

  <page-template :completed="true">

    <h1>Checkboxes</h1>

    <p>This is a standard 'checkbox' component:</p>

    <show>
      <k-checkbox
        label="I agree"
        :checked="true"
      />
    </show>

    <h2>Usage guidelines</h2>

    <h3>Layout</h3>
    <ul>
      <li>Always left-aligned, with the checkbox to the left of the label</li>
      <li>When in a group, always vertically stacked</li>
    </ul>

    <h3>Language</h3>
    <p>The labels should be short and concise. They should not be sentences.</p>

    <h3>Other notes</h3>
    <ul>
      <li>Should denote positives (yes/select)</li>
      <li>Should not be used to filter tables or lists</li>
      <li>Should not be nested</li>
    </ul>

    <h2>API</h2>
    <component-docs :api="kCheckboxApi" />

    <h2>Code Example</h2>
    <vue-example :code="example" />

  </page-template>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import componentDocs from '../../shell/component-docs';
  import vueExample from '../../shell/vue-example';
  import pageTemplate from '../../shell/page-template';
  import show from '../../shell/show';

  import example from 'raw-loader!./example.html';
  import kCheckboxApi from '!vue-doc!kolibri.coreVue.components.kCheckbox';

  FullVue.component('k-checkbox', kCheckbox);

  export default {
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
      kCheckbox,
      show,
    },
    data: () => ({
      kCheckboxApi,
      example,
    }),
  };

</script>


<style lang="stylus" scoped></style>
