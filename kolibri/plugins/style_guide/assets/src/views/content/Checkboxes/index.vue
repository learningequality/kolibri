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
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import componentDocs from '../../shell/ComponentDocs';
  import vueExample from '../../shell/VueExample';
  import pageTemplate from '../../shell/PageTemplate';
  import show from '../../shell/Show';

  import example from 'raw-loader!./example.html';
  import kCheckboxApi from '!vue-doc!kolibri.coreVue.components.KCheckbox';

  FullVue.component('k-checkbox', KCheckbox);

  export default {
    name: 'Checkboxes',
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
      KCheckbox,
      show,
    },
    data: () => ({
      kCheckboxApi,
      example,
    }),
  };

</script>


<style lang="scss" scoped></style>
