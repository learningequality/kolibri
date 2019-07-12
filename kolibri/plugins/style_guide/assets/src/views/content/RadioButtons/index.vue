<template>

  <PageTemplate :completed="false">

    <PageSection>
      <ComponentDocs :api="kRadioButtonApi" />

      <h2>Code Example</h2>
      <VueExample :code="exampleCode">
        <Example />
      </VueExample>

      <h2>Guidelines</h2>
      <h3>Usage</h3>
      <ul>
        <li>Should be used when all options must be visible. If not, use a select.</li>
        <li>Selected state of radio buttons should denote positives (yes/selected)</li>
        <li>Should not be used to filter tables or lists</li>
        <li>Should not be nested</li>
      </ul>

      <h3>Style</h3>
      <ul>
        <li>Always left-aligned</li>
        <li>Vertically stacked</li>
      </ul>

      <h3>Language</h3>
      <ul>
        <li>Labels should be short and concise. Should not be sentences.</li>
      </ul>

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

  import kRadioButtonApi from '!vue-doc!kolibri.coreVue.components.KRadioButton';

  export default {
    name: 'RadioButtons',
    components: {
      PageTemplate,
      PageSection,
      ComponentDocs,
      VueExample,
      Example,
    },
    data: () => ({
      kRadioButtonApi,
      exampleCode,
    }),
  };

</script>


<style lang="scss" scoped></style>
