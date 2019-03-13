<template>

  <PageTemplate title="Loaders" :completed="false">

    <h3><code>{{ KCircularLoaderApi.name }}</code> API</h3>
    <ComponentDocs :api="KCircularLoaderApi" />
    <h3>Code Example</h3>
    <VueExample :code="KCircularLoaderExampleCode">
      <KCircularLoaderExample />
    </VueExample>


    <h3><code>{{ KLinearLoaderApi.name }}</code> API</h3>
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

  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';

  import KLinearLoaderExample from './KLinearLoaderExample';
  import KLinearLoaderExampleCode from '!!raw-loader!./KLinearLoaderExample';
  import KCircularLoaderExample from './KCircularLoaderExample';
  import KCircularLoaderExampleCode from '!!raw-loader!./KCircularLoaderExample';

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
