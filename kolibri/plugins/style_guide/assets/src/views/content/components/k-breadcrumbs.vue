<template>

  <component-template :codeExamplesTemplate="kBreadcrumbsExample" :api="kBreadcrumbsApi" status="complete">
    <div slot="guidelines">

      <h3>Usage</h3>
      <ul>
        <li>Should be used with any instance of the topic tree.</li>
        <li>Should be directly above the content intended to navigate through.</li>
        <li>Should include the current item/location, which does not require a link.</li>
      </ul>

      <h3>Responsiveness</h3>
      <ul>
        <li>Items do not wrap to another line.</li>
        <li>The current item/location is always shown, and truncated if necessary.</li>
        <li>Items that do not fit within will pushed into the dropdown.</li>
        <li>Items within dropdown are orderd bottom up. Meaning, the highest level item will be at the bottom.</li>
      </ul>
    </div>
  </component-template>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import componentTemplate from '../../shell/component-template';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  import kBreadcrumbsApi from '!vue-doc!kolibri.coreVue.components.kBreadcrumbs';
  FullVue.component('k-breadcrumbs', kBreadcrumbs);
  import kBreadcrumbsExample from 'raw-loader!./k-breadcrumbs-example.html';

  export default {
    components: {
      componentTemplate,
    },
    data: () => ({
      kBreadcrumbsApi,
      kBreadcrumbsExample,
    }),
  };

</script>


<style lang="stylus"></style>
