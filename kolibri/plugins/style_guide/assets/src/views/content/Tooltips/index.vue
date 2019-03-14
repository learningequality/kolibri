<template>

  <PageTemplate :completed="false">

    <h1>Tooltips</h1>


    <h2>Usage guidelines</h2>


    <ComponentDocs :api="KTooltipApi" />

    <h2>Code Example</h2>
    <VueExample :code="exampleCode">
      <Example />
    </VueExample>

  </PageTemplate>

</template>


<script>

  import KTooltip from 'kolibri.coreVue.components.KTooltip';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';

  /* eslint-disable import/no-duplicates */
  import Example from './Example.vue';
  import exampleCode from '!!raw-loader!./Example.vue';
  /* eslint-enable import/no-duplicates */

  import KTooltipApi from '!vue-doc!kolibri.coreVue.components.KTooltip';

  export default {
    name: 'Tooltips',
    components: {
      PageTemplate,
      ComponentDocs,
      VueExample,
      Example,
    },
    data: () => ({
      KTooltipApi,
      exampleCode,
    }),
  };

</script>


<style lang="scss" scoped></style>
