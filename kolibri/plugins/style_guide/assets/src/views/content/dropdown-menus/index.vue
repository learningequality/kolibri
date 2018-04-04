<template>

  <page-template title="Dropdown Menus" :completed="false">

    <h2><code>{{ kDropdownMenuApi.name }}</code> API</h2>
    <component-docs :api="kDropdownMenuApi" />

    <h2>Code Example</h2>
    <vue-example :code="example" />

    <h2>Guidelines</h2>

  </page-template>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import kDropdownMenu from 'kolibri.coreVue.components.kDropdownMenu';
  import componentDocs from '../../shell/component-docs';
  import vueExample from '../../shell/vue-example';
  import pageTemplate from '../../shell/page-template';

  import example from 'raw-loader!./example.html';
  import kDropdownMenuApi from '!vue-doc!kolibri.coreVue.components.kDropdownMenu';

  FullVue.component('k-dropdown-menu', kDropdownMenu);

  export default {
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
    },
    data: () => ({
      kDropdownMenuApi,
      example,
    }),
  };

</script>


<style lang="stylus" scoped></style>
