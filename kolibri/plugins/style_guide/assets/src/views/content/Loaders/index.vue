<template>

  <PageTemplate title="Loaders" :completed="false">


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

  </PageTemplate>

</template>


<script>

  import PageTemplate from '../../shell/PageTemplate';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';

  /* eslint-disable import/no-duplicates */
  import KLinearLoaderExample from './KLinearLoaderExample';
  import KLinearLoaderExampleCode from '!!raw-loader!./KLinearLoaderExample';
  import KCircularLoaderExample from './KCircularLoaderExample';
  import KCircularLoaderExampleCode from '!!raw-loader!./KCircularLoaderExample';
  /* eslint-enable import/no-duplicates */

  import KLinearLoaderApi from '!vue-doc!kolibri.coreVue.components.KLinearLoader';
  import KCircularLoaderApi from '!vue-doc!kolibri.coreVue.components.KCircularLoader';

  export default {
    name: 'Loaders',
    components: {
      PageTemplate,
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
