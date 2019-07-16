<template>

  <PageTemplate :completed="false">
    <PageSection>

      <ComponentDocs :api="kGridApi" />


      <ComponentDocs :api="kGridItemApi" />

      <h2>Code Example</h2>
      <VueExample :code="exampleCode">
        <Example />
      </VueExample>

      <h2>Guidelines</h2>
      <p>use em!</p>

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

  import kGridApi from '!vue-doc!kolibri.coreVue.components.KGrid';
  import kGridItemApi from '!vue-doc!kolibri.coreVue.components.KGridItem';

  export default {
    name: 'Grids',
    components: {
      PageTemplate,
      PageSection,
      ComponentDocs,
      VueExample,
      Example,
    },
    data: () => ({
      kGridApi,
      kGridItemApi,
      exampleCode,
    }),
  };

</script>


<style lang="scss" scoped></style>
