<template>

  <PageTemplate>

    <PageSection title="Usage guidelines" anchor="#usage">

      <p>This is a standard checkbox component:</p>

      <Show>
        <KCheckbox
          label="I agree"
          :checked="true"
        />
      </Show>

      <p>Layout and usage:</p>
      <ul>
        <li>Always left-aligned</li>
        <li>When used in a group, checkboxes should always be vertically stacked</li>
        <li>Should not be used to filter tables or lists</li>
        <li>Should not be nested</li>
      </ul>

      <p>Language:</p>
      <ul>
        <li>The labels should be short and concise. They should not be sentences</li>
        <li>Should represent positive values</li>
      </ul>

    </PageSection>
    <PageSection title="Usage" anchor="#usage" fullwidth>
      <VueExample :code="exampleCode">
        <Example />
      </VueExample>
    </PageSection>
    <PageSection title="Exceptions" anchor="#exceptions">
      <ul>
        <li>
          In the Facility Settings section, the checkbox labels are more verbose than in other
          places. They are generally of the form "Allow learners to sign in with no password",
          and are meant to be as explicit as possible to fully communicate complex ideas
        </li>
      </ul>
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

  import kCheckboxApi from '!vue-doc!kolibri-components/src/KCheckbox';

  export default {
    name: 'KCheckbox',
    components: {
      PageTemplate,
      PageSection,
      VueExample,
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
