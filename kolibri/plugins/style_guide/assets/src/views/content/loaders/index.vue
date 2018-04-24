<template>

  <page-template title="Loaders" :completed="false">

    <h3><code>{{ kCircularLoaderApi.name }}</code> API</h3>
    <component-docs :api="kCircularLoaderApi" />
    <h3>Code Example</h3>
    <vue-example :code="kCircularLoaderExample" />


    <h3><code>{{ kLinearLoaderApi.name }}</code> API</h3>
    <component-docs :api="kLinearLoaderApi" />
    <h3>Code Example</h3>
    <vue-example :code="kLinearLoaderExample" />


    <h3>Guidelines</h3>
    <p>TODO</p>

  </page-template>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import pageTemplate from '../../shell/page-template';
  import componentDocs from '../../shell/component-docs';
  import vueExample from '../../shell/vue-example';

  import kLinearLoader from 'kolibri.coreVue.components.kLinearLoader';
  import kCircularLoader from 'kolibri.coreVue.components.kCircularLoader';

  import kLinearLoaderExample from 'raw-loader!./k-linear-loader-example.html';
  import kCircularLoaderExample from 'raw-loader!./k-circular-loader-example.html';

  import kLinearLoaderApi from '!vue-doc!kolibri.coreVue.components.kLinearLoader';
  import kCircularLoaderApi from '!vue-doc!kolibri.coreVue.components.kCircularLoader';

  FullVue.component('k-linear-loader', kLinearLoader);
  FullVue.component('k-circular-loader', kCircularLoader);

  export default {
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
    },
    data: () => ({
      kCircularLoaderExample,
      kLinearLoaderExample,
      kCircularLoaderApi,
      kLinearLoaderApi,
    }),
  };

</script>


<style lang="stylus" scoped></style>
