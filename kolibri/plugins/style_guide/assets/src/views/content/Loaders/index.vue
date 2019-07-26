<template>

  <PageTemplate :completed="false">

    <PageSection>
      <ComponentDocs :api="KCircularLoaderApi" />
      <h3>Code Example</h3>
      <VueExample :code="KCircularLoaderExampleCode">
        <KCircularLoaderExample />
      </VueExample>



      <ComponentDocs :api="KLinearLoaderApi" />
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

  import PageTemplate from '../../shell/PageTemplate';
  import PageSection from '../../shell/PageTemplate/PageSection';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';

  /* eslint-disable import/no-duplicates */
  import KLinearLoaderExample from './KLinearLoaderExample';
  import KCircularLoaderExample from './KCircularLoaderExample';
  import KLinearLoaderExampleCode from '!!raw-loader!./KLinearLoaderExample';
  import KCircularLoaderExampleCode from '!!raw-loader!./KCircularLoaderExample';

  import KLinearLoaderApi from '!vue-doc!kolibri.coreVue.components.KLinearLoader';
  import KCircularLoaderApi from '!vue-doc!kolibri.coreVue.components.KCircularLoader';
  /* eslint-enable import/no-duplicates */

  export default {
    name: 'Loaders',
    components: {
      PageTemplate,
      PageSection,
      ComponentDocs,
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
