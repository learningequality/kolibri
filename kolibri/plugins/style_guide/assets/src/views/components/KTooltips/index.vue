<template>

  <PageTemplate :completed="false">

    <PageSection>
      <h1>Tooltips</h1>


      <h2>Usage guidelines</h2>



      <h2>Code Example</h2>
      <VueExample :code="exampleCode">
        <Example />
      </VueExample>
    </PageSection>
  </PageTemplate>

</template>


<script>

  import VueExample from '../../common/VueExample';
  import PageTemplate from '../../common/PageTemplate';
  import PageSection from '../../common/PageSection';

  /* eslint-disable import/no-duplicates */
  import Example from './Example.vue';
  import exampleCode from '!!raw-loader!./Example.vue';
  /* eslint-enable import/no-duplicates */

  import KTooltipApi from '!vue-doc!kolibri-components/src/KTooltip';

  export default {
    name: 'KTooltips',
    components: {
      PageTemplate,
      PageSection,
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
