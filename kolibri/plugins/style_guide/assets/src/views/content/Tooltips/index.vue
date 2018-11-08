<template>

  <PageTemplate :completed="false">

    <h1>Tooltips</h1>


    <h2>Usage guidelines</h2>

    <h2>API</h2>
    <ComponentDocs :api="KTooltipApi" />

    <h2>Code Example</h2>
    <VueExample :code="example" />

  </PageTemplate>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import KTooltip from 'kolibri.coreVue.components.KTooltip';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';

  import example from 'raw-loader!./example.html';
  import KTooltipApi from '!vue-doc!kolibri.coreVue.components.KTooltip';

  FullVue.component('k-tooltip', KTooltip);

  export default {
    name: 'Tooltips',
    components: {
      PageTemplate,
      ComponentDocs,
      VueExample,
    },
    data: () => ({
      KTooltipApi,
      example,
    }),
  };

</script>


<style lang="scss" scoped></style>
