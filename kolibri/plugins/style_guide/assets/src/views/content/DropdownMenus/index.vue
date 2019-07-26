<template>

  <PageTemplate :completed="false">

    <PageSection title="API" anchor="#api">
      <ComponentDocs :api="kDropdownMenuApi" />
    </PageSection>

    <PageSection title="Code example" anchor="#example" fullwidth>
      <VueExample :code="exampleCode">
        <Example />
      </VueExample>
    </PageSection>

  </PageTemplate>

</template>


<script>

  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';
  import PageSection from '../../shell/PageTemplate/PageSection';

  /* eslint-disable import/no-duplicates */
  import Example from './Example.vue';
  import exampleCode from '!!raw-loader!./Example.vue';
  /* eslint-enable import/no-duplicates */

  import kDropdownMenuApi from '!vue-doc!kolibri.coreVue.components.KDropdownMenu';

  export default {
    name: 'DropdownMenus',
    components: {
      PageTemplate,
      PageSection,
      ComponentDocs,
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
