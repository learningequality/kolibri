<template>

  <PageTemplate :completed="false">

    <PageSection>
      <h3>Code Example</h3>
      <VueExample :code="ExampleCode">
        <Example />
      </VueExample>

      <h3>Guidelines</h3>
      <p>TODO</p>
    </PageSection>

  </PageTemplate>

</template>


<script>

  import PageTemplate from '../../common/PageTemplate';
  import PageSection from '../../common/PageSection';
  import VueExample from '../../common/VueExample';

  /* eslint-disable import/no-duplicates */
  import Example from './Example';
  import ExampleCode from '!!raw-loader!./Example';

  import KCircularLoaderApi from '!vue-doc!kolibri-components/src/loaders/KCircularLoader';
  /* eslint-enable import/no-duplicates */

  export default {
    name: 'KCircularLoader',
    components: {
      PageTemplate,
      PageSection,
      VueExample,
      Example,
    },
    data: () => ({
      ExampleCode,
      KCircularLoaderApi,
    }),
  };

</script>


<style lang="scss" scoped></style>
