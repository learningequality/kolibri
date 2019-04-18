<template>

  <PageTemplate title="Dropdown Menus" :completed="false">


    <ComponentDocs :api="kDropdownMenuApi" />

    <h2>Code Example</h2>
    <VueExample :code="exampleCode">
      <Example />
    </VueExample>

    <h2>Guidelines</h2>

  </PageTemplate>

</template>


<script>

  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';

  /* eslint-disable import/no-duplicates */
  import Example from './Example.vue';
  import exampleCode from '!!raw-loader!./Example.vue';
  /* eslint-enable import/no-duplicates */

  import kDropdownMenuApi from '!vue-doc!kolibri.coreVue.components.KDropdownMenu';

  export default {
    name: 'DropdownMenus',
    components: {
      PageTemplate,
      ComponentDocs,
      VueExample,
      Example,
    },
    data: () => ({
      kDropdownMenuApi,
      exampleCode,
    }),
  };

</script>


<style lang="scss" scoped></style>
