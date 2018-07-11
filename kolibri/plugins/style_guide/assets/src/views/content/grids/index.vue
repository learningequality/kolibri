<template>

  <page-template title="Grid" :completed="false">

    <h2><code>{{ kGridApi.name }}</code> API</h2>
    <component-docs :api="kGridApi" />

    <h2><code>{{ kGridItemApi.name }}</code> API</h2>
    <component-docs :api="kGridItemApi" />

    <h2>Code Example</h2>
    <vue-example :code="example" />

    <h2>Guidelines</h2>
    <p>use em!</p>

  </page-template>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import kGrid from 'kolibri.coreVue.components.kGrid';
  import kGridItem from 'kolibri.coreVue.components.kGridItem';
  import componentDocs from '../../shell/component-docs';
  import vueExample from '../../shell/vue-example';
  import pageTemplate from '../../shell/page-template';

  import example from 'raw-loader!./example.html';
  import kGridApi from '!vue-doc!kolibri.coreVue.components.kGrid';
  import kGridItemApi from '!vue-doc!kolibri.coreVue.components.kGridItem';

  FullVue.component('k-grid', kGrid);
  FullVue.component('k-grid-item', kGridItem);

  export default {
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
    },
    data: () => ({
      kGridApi,
      kGridItemApi,
      example,
    }),
  };

</script>


<style lang="scss" scoped></style>
