<template>

  <PageTemplate>
    <PageSection title="Usage guidelines" anchor="#usage">

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
    </PageSection>

    <PageSection title="Code example" anchor="#example" fullwidth>
      <VueExample :code="exampleCode">
        <Example />
      </VueExample>
    </PageSection>

  </PageTemplate>

</template>


<script>

  import KBreadcrumbs from 'kolibri.coreVue.components.KBreadcrumbs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';
  import PageSection from '../../shell/PageSection';
  import Show from '../../shell/Show';

  /* eslint-disable import/no-duplicates */
  import Example from './Example.vue';
  import exampleCode from '!!raw-loader!./Example.vue';
  /* eslint-enable import/no-duplicates */

  import kBreadcrumbsApi from '!vue-doc!kolibri.coreVue.components.KBreadcrumbs';

  export default {
    name: 'Breadcrumbs',
    components: {
      PageTemplate,
      PageSection,
      VueExample,
      KBreadcrumbs,
      Show,
      Example,
    },
    data: () => ({
      kBreadcrumbsApi,
      exampleCode,
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
