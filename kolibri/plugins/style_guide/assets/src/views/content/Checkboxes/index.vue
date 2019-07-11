<template>

  <PageTemplate :completed="true">

    <h1>Checkboxes</h1>

    <p>This is a standard 'checkbox' component:</p>

    <Show>
      <KCheckbox
        label="I agree"
        :checked="true"
      />
    </Show>

    <h2>Usage guidelines</h2>

    <h3>Layout</h3>
    <ul>
      <li>Always left-aligned, with the checkbox to the left of the label</li>
      <li>When in a group, always vertically stacked</li>
    </ul>

    <h3>Language</h3>
    <p>The labels should be short and concise. They should not be sentences.</p>

    <h3>Other notes</h3>
    <ul>
      <li>Should denote positives (yes/select)</li>
      <li>Should not be used to filter tables or lists</li>
      <li>Should not be nested</li>
    </ul>


    <ComponentDocs :api="kCheckboxApi" />

    <h2>Code Example</h2>
    <VueExample :code="exampleCode">
      <Example />
    </VueExample>

  </PageTemplate>

</template>


<script>

  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';
  import Show from '../../shell/Show';

  /* eslint-disable import/no-duplicates */
  import Example from './Example.vue';
  import exampleCode from '!!raw-loader!./Example.vue';
  /* eslint-enable import/no-duplicates */

  import kCheckboxApi from '!vue-doc!kolibri.coreVue.components.KCheckbox';

  export default {
    name: 'Checkboxes',
    components: {
      PageTemplate,
      ComponentDocs,
      VueExample,
      KCheckbox,
      Show,
      Example,
    },
    data: () => ({
      kCheckboxApi,
      exampleCode,
    }),
  };

</script>


<style lang="scss" scoped></style>
