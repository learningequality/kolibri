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
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import componentDocs from '../../shell/ComponentDocs';
  import vueExample from '../../shell/VueExample';
  import pageTemplate from '../../shell/PageTemplate';

  import example from 'raw-loader!./example.html';
  import kDropdownMenuApi from '!vue-doc!kolibri.coreVue.components.KDropdownMenu';

  FullVue.component('k-dropdown-menu', KDropdownMenu);

  export default {
    name: 'DropdownMenus',
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


<style lang="scss" scoped></style>
