<template>

  <PageTemplate :completed="false">

    <PageSection>
      <h1>Tooltips</h1>


      <h2>Usage guidelines</h2>


      <ComponentDocs :api="KTooltipApi" />

      <h2>Code Example</h2>
      <VueExample :code="exampleCode">
        <Example />
      </VueExample>
    </PageSection>
  </PageTemplate>

</template>


<script>

  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';
  import PageSection from '../../shell/PageTemplate/PageSection';

  /* eslint-disable import/no-duplicates */
  import Example from './Example.vue';
  import exampleCode from '!!raw-loader!./Example.vue';
  /* eslint-enable import/no-duplicates */

  import KTooltipApi from '!vue-doc!kolibri.coreVue.components.KTooltip';

  export default {
    name: 'Tooltips',
    components: {
      PageTemplate,
      PageSection,
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
