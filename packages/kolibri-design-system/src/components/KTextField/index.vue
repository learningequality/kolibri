<template>

  <PageTemplate :completed="false">

    <PageSection>

      <h2>Code Example</h2>
      <VueExample :code="exampleCode">
        <Example />
      </VueExample>

      <h2>Guidelines</h2>
      <h3>Labels</h3>
      <p>
        Keep this short, concise, and easy for the user to understand. Labels
        should not be structured as a sentence or question.
      </p>
      <p>
        Labels should be phrased according to a user’s understanding—avoid
        technical jargon
      </p>
      <p>
        Accessibility tips:
        <ul>
          <li>
            Label must be present in order to be visible to assistive technology
          </li>
          <li>
            Be sure that label is visible to assistive technology by using ARIA
          </li>
        </ul>
      </p>
      <table>
        <tr>
          <th>Do</th>
          <th>Don'ts</th>
        </tr>
        <tr>
          <td>"Full name"</td>
          <td>"Write your full name here" (sentence)</td>
        </tr>
        <tr>
          <td>"Password"</td>
          <td>"Enter your authentication hash" (tehnical term)</td>
        </tr>
        <tr>
          <td>"Questions"</td>
          <td>"How many questions?" (question)</td>
        </tr>
      </table>

      <h3>Placeholder text</h3>
      <p>
        Should be a short hint or instruction that disappears on focus
      </p>
      <p>
        Data samples (e.g. - "Joe Schmoe") should be avoided as they are
        difficult to internationalize
      </p>

      <h3>Maximum length</h3>
      <p>
        If the backend has a character limit, be sure to enable
        "enforceMaxLength" on the text field. Expected input should never exceed
        one line. If the case for 2 or more input lines emerges, a pattern for a
        &lt;textarea&gt; component will need to be defined.
      </p>

      <h3>Validation &amp; error handling</h3>
      <p>
        Real time validation helps users avoid submitting data with errors.
        Validation covers the following scenarios:
      </p>
      <ul>
        <li>
          Incorrect input - label + field line turn red, red error text
          underneath field line
        </li>
        <li>
          Max character reached - field doesn’t permit typing additional
          characters, no error message
        </li>
      </ul>
      <p>Server-side feedback (after submission of data)</p>
      <ul>
        <li>
          Feedback should be concise, easy for the user to understand, and
          contain actionable information. (link to error handling pattern (when
          it exists)).
        </li>
        <li>
          Input label + field line with error turns red, and feedback displays
          underneath the input
        </li>
        <li>
          Examples: "Username already exists." → "Username already exists.
          Please choose another."
        </li>
      </ul>
      <p>
        Required fields use the HTML5 attribute. All other errors / validations
        use the custom javascript.
      </p>

      <h3>Width & Layout</h3>
      <p>
        Generally, if a text form is placed within a modal, it should be
        measured in % and span to 100% of the width for it
      </p>
      <p>
        If a text field is outside of a modal, it should have a "max-width" of
        400px
      </p>
      <p>
        If there are multiple text fields, they should be stacked vertically,
        with even space between them. See Forms(Pattern) for implementation
        details
      </p>

      <h3>Required fields</h3>
      <p>
        Required (post-google work)
      </p>

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

  import kTextboxApi from '!vue-doc!kolibri-components/src/KTextbox';

  export default {
    name: 'KTextField',
    components: {
      PageTemplate,
      PageSection,
      VueExample,
      Example,
    },
    data: () => ({
      kTextboxApi,
      exampleCode,
    }),
  };

</script>


<style lang="scss" scoped></style>
