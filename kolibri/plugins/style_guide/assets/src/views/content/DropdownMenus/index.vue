<template>

  <PageTemplate title="Dropdown Menus" :completed="false">

    <h2><code>{{ kDropdownMenuApi.name }}</code> API</h2>
    <ComponentDocs :api="kDropdownMenuApi" />

    <h2>Code Example</h2>
    <VueExample :code="example" />

    <h2>Guidelines</h2>

  </PageTemplate>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';

  import example from 'raw-loader!./example.html';
  import kDropdownMenuApi from '!vue-doc!kolibri.coreVue.components.KDropdownMenu';

  FullVue.component('k-dropdown-menu', KDropdownMenu);

  export default {
    name: 'DropdownMenus',
    components: {
      PageTemplate,
      ComponentDocs,
      VueExample,
    },
    data: () => ({
      kDropdownMenuApi,
      example,
    }),
  };

</script>


<style lang="scss" scoped></style>
