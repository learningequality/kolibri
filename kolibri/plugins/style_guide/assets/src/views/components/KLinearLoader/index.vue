<template>

  <PageTemplate :completed="false">

    <PageSection>
      <h3>Code Example</h3>
      <VueExample :code="KCircularLoaderExampleCode">
        <KCircularLoaderExample />
      </VueExample>



      <h3>Code Example</h3>
      <VueExample :code="KLinearLoaderExampleCode">
        <KLinearLoaderExample />
      </VueExample>


      <h3>Guidelines</h3>
      <p>TODO</p>
    </PageSection>

  </PageTemplate>

</template>


<script>

  import PageTemplate from '../../common/PageTemplate';
  import PageSection from '../../common/PageSection';
  import VueExample from '../../common/VueExample';

  /* eslint-disable import/no-duplicates */
  import KLinearLoaderExample from './KLinearLoaderExample';
  import KCircularLoaderExample from './KCircularLoaderExample';
  import KLinearLoaderExampleCode from '!!raw-loader!./KLinearLoaderExample';
  import KCircularLoaderExampleCode from '!!raw-loader!./KCircularLoaderExample';

  import KLinearLoaderApi from '!vue-doc!kolibri.shared.KLinearLoader';
  import KCircularLoaderApi from '!vue-doc!kolibri.shared.KCircularLoader';
  /* eslint-enable import/no-duplicates */

  export default {
    name: 'Loaders',
    components: {
      PageTemplate,
      PageSection,
      VueExample,
      KLinearLoaderExample,
      KCircularLoaderExample,
    },
    data: () => ({
      KCircularLoaderExampleCode,
      KLinearLoaderExampleCode,
      KCircularLoaderApi,
      KLinearLoaderApi,
    }),
  };

</script>


<style lang="scss" scoped></style>
