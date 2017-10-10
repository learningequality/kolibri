<template>

  <page-template :completed="true">

    <h1>Channel breadcrumbs</h1>

    <h2>Usage guidelines</h2>

    <p>
      Breadcrumbs should be used to aid navigation with any instance of the topic tree.
      Place it directly above the content to be navigated through.
    </p>

    <p>
      It should include the current item/location, which does not require a link. (This
      might be redundant with a header.)
    </p>

    <show>
      <k-breadcrumbs :items="breadcrumbs"/>
    </show>

    <h2>API</h2>
    <component-docs :api="kBreadcrumbsApi" />

    <h2>Code Example</h2>
    <vue-example :code="example" />

  </page-template>

</template>


<script>

  import componentDocs from '../../shell/component-docs';
  import vueExample from '../../shell/vue-example';
  import pageTemplate from '../../shell/page-template';
  import show from '../../shell/show';

  import example from 'raw-loader!./example.html';
  import kBreadcrumbsApi from '!vue-doc!kolibri.coreVue.components.kBreadcrumbs';

  import FullVue from 'vue/dist/vue.common';
  import kBreadcrumbs from 'kolibri.coreVue.components.kBreadcrumbs';
  FullVue.component('k-breadcrumbs', kBreadcrumbs);

  export default {
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
      kBreadcrumbs,
      show,
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


<style lang="stylus" scoped></style>
