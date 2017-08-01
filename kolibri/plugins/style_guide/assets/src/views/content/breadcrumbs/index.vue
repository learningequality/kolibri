<template>

  <page-template title="Breadcrumbs" :completed="false">

    <h2><code>{{ kBreadcrumbsApi.name }}</code> API</h2>
    <component-docs :api="kBreadcrumbsApi" />

    <h2>Code Example</h2>
    <vue-example :code="example" />

    <h2>Guidelines</h2>

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

  </page-template>

</template>


<script>

  import componentDocs from '../../shell/component-docs';
  import vueExample from '../../shell/vue-example';
  import pageTemplate from '../../shell/page-template';

  import example from 'raw-loader!./example.html';
  import kBreadcrumbsApi from '!vue-doc!kolibri.coreVue.components.kBreadcrumbs';

  import FullVue from 'vue/dist/vue.common';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  FullVue.component('k-breadcrumbs', kBreadcrumbs);

  export default {
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
    },
    data: () => ({
      kBreadcrumbsApi,
      example,
    }),
  };

</script>


<style lang="stylus"></style>
