<template>

  <PageTemplate title="Loaders" :completed="false">

    <h3><code>{{ kCircularLoaderApi.name }}</code> API</h3>
    <ComponentDocs :api="kCircularLoaderApi" />
    <h3>Code Example</h3>
    <VueExample :code="kCircularLoaderExample" />


    <h3><code>{{ kLinearLoaderApi.name }}</code> API</h3>
    <ComponentDocs :api="kLinearLoaderApi" />
    <h3>Code Example</h3>
    <VueExample :code="kLinearLoaderExample" />


    <h3>Guidelines</h3>
    <p>TODO</p>

  </PageTemplate>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import PageTemplate from '../../shell/PageTemplate';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';

  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';

  import kLinearLoaderExample from 'raw-loader!./k-linear-loader-example.html';
  import kCircularLoaderExample from 'raw-loader!./k-circular-loader-example.html';

  import kLinearLoaderApi from '!vue-doc!kolibri.coreVue.components.KLinearLoader';
  import kCircularLoaderApi from '!vue-doc!kolibri.coreVue.components.KCircularLoader';

  FullVue.component('k-linear-loader', KLinearLoader);
  FullVue.component('k-circular-loader', KCircularLoader);

  export default {
    name: 'Loaders',
    components: {
      PageTemplate,
      ComponentDocs,
      VueExample,
    },
    data: () => ({
      kCircularLoaderExample,
      kLinearLoaderExample,
      kCircularLoaderApi,
      kLinearLoaderApi,
    }),
  };

</script>


<style lang="scss" scoped></style>
