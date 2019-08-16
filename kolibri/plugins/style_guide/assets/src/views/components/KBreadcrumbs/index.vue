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

  import VueExample from '../../common/VueExample';
  import PageTemplate from '../../common/PageTemplate';
  import PageSection from '../../common/PageSection';
  import Show from '../../common/Show';

  /* eslint-disable import/no-duplicates */
  import Example from './Example.vue';
  import exampleCode from '!!raw-loader!./Example.vue';
  /* eslint-enable import/no-duplicates */

  import kBreadcrumbsApi from '!vue-doc!kolibri-components/src/KBreadcrumbs';

  export default {
    name: 'KBreadcrumbs',
    components: {
      PageTemplate,
      PageSection,
      VueExample,
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
