<template>

  <PageTemplate title="Grid" :completed="false">

    <h2><code>{{ kGridApi.name }}</code> API</h2>
    <ComponentDocs :api="kGridApi" />

    <h2><code>{{ kGridItemApi.name }}</code> API</h2>
    <ComponentDocs :api="kGridItemApi" />

    <h2>Code Example</h2>
    <VueExample :code="example" />

    <h2>Guidelines</h2>
    <p>use em!</p>

  </PageTemplate>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';

  import example from 'raw-loader!./example.html';
  import kGridApi from '!vue-doc!kolibri.coreVue.components.KGrid';
  import kGridItemApi from '!vue-doc!kolibri.coreVue.components.KGridItem';

  FullVue.component('k-grid', KGrid);
  FullVue.component('k-grid-item', KGridItem);

  export default {
    name: 'Grids',
    components: {
      PageTemplate,
      ComponentDocs,
      VueExample,
    },
    data: () => ({
      kGridApi,
      kGridItemApi,
      example,
    }),
  };

</script>


<style lang="scss" scoped></style>
