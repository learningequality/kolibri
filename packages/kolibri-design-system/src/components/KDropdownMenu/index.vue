<template>

  <PageTemplate :completed="false">

    <PageSection title="Usage" anchor="#usage" fullwidth>
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

  /* eslint-disable import/no-duplicates */
  import Example from './Example.vue';
  import exampleCode from '!!raw-loader!./Example.vue';
  /* eslint-enable import/no-duplicates */

  import kDropdownMenuApi from '!vue-doc!kolibri-components/src/KDropdownMenu';

  export default {
    name: 'KDropdownMenu',
    components: {
      PageTemplate,
      PageSection,
      VueExample,
      Example,
    },
    data: () => ({
      kDropdownMenuApi,
      exampleCode,
    }),
  };

</script>


<style lang="scss" scoped></style>
