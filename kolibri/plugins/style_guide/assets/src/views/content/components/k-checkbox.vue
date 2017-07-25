<template>

  <component-template :codeExamplesTemplate="kCheckboxExample" :api="kCheckboxApi">
    <div slot="guidelines">

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

    </div>
  </component-template>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import componentTemplate from '../../shell/component-template';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import kCheckboxApi from '!vue-doc!kolibri.coreVue.components.kCheckbox';
  FullVue.component('k-checkbox', kCheckbox);
  import kCheckboxExample from 'raw-loader!./k-checkbox-example.html';

  export default {
    components: {
      componentTemplate,
    },
    data: () => ({
      kCheckboxApi,
      kCheckboxExample,
    }),
  };

</script>


<style lang="stylus"></style>
