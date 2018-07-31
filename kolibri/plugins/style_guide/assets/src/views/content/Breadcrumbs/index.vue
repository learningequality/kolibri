<template>

  <PageTemplate :completed="true">

    <h1>Topic tree breadcrumbs</h1>

    <p>
      Breadcrumbs should be used to aid navigation across channels, topic trees, and resources.
      Place it directly above the content to be navigated through.
    </p>

    <p>
      The last item should be the current item, which will not be linked.
      This text might be redundant with the same name in an adjacent header, which is ok.
    </p>

    <Show>
      <KBreadcrumbs :items="breadcrumbs" />
    </Show>

    <h2>API</h2>
    <ComponentDocs :api="kBreadcrumbsApi" />

    <h2>Code Example</h2>
    <VueExample :code="example" />

  </PageTemplate>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import KBreadcrumbs from 'kolibri.coreVue.components.KBreadcrumbs';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';
  import Show from '../../shell/Show';

  import example from 'raw-loader!./example.html';
  import kBreadcrumbsApi from '!vue-doc!kolibri.coreVue.components.KBreadcrumbs';

  FullVue.component('k-breadcrumbs', KBreadcrumbs);

  export default {
    name: 'Breadcrumbs',
    components: {
      PageTemplate,
      ComponentDocs,
      VueExample,
      KBreadcrumbs,
      Show,
    },
    data: () => ({
      kBreadcrumbsApi,
      example,
    }),
    computed: {
      breadcrumbs() {
        return [
          {
            text: 'Channel',
            link: {},
          },
          {
            text: 'Topic',
            link: {},
          },
          {
            text: 'Item',
          },
        ];
      },
    },
  };

</script>


<style lang="scss" scoped></style>
