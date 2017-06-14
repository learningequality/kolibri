<template>

  <component-style-guide
      class="text-fields-style-guide"
      :codeExamplesTemplate="codeExamplesTemplate"
      :api="api">

    <h1 slot="title">Text fields</h1>
    <p slot="summary">
      Text fields to allow the user to input data for submission. Use them for
      short length text and numeric input.
    </p>

    <div slot="guidelines-and-usage">

      <h3>Labels</h3>
      <p>
        Keep this short, concise, and easy for the user to understand. Labels
        should not be structured as a sentence or question.
      </p>
      <p>
        Labels should be phrased according to a user’s understanding—avoid
        technical jargon.
      </p>
      <p>
        Accessibility tips:
        <ul>
          <li>
            Label must be present in order to be visible to assistive technology.
          </li>
          <li>
            Be sure that label is visible to assistive technology by using ARIA.
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
        Should be a short hint or instruction that disappears on focus.
      </p>
      <p>
        Data samples (e.g. - "Joe Schmoe") should be avoided as they are difficult
        to internationalize.
      </p>

      <h3>Maximum length</h3>
      <p>
        If the backend has a character limit, be sure to enable
        "enforceMaxLength" on the text field. Expected input should never exceed
        one line. If the case for 2 or more input lines emerges, a pattern for a
        &lt;textarea&gt; component will need to be defined.
      </p>

      <h3>Validation & error handling</h3>
      <p>
        Real time validation helps users avoid submitting data with errors.
        Validation covers the following scenarios:
      </p>
      <ul>
        <li>
          Incorrect input - label + field line turn red, red error text underneath
          field line
        </li>
        <li>
          Max character reached - field doesn’t permit typing additional
          characters, no error message
        </li>
      </ul>
      <p>Server-side feedback (after submission of data)</p>
      <ul>
        <li>
          Feedback should be concise, easy for the user to understand, and contain
          actionable information. (link to error handling pattern (when it
          exists)).
        </li>
        <li>
          Input label + field line with error turns red, and feedback displays
          underneath the input.
        </li>
        <li>
          Examples: “Username already exists.” → “Username already exists. Please
          choose another.”
        </li>
      </ul>
      <p>
        Required fields use the HTML5 attribute. All other errors / validations
        use the custom javascript.
      </p>

      <h3>Width & Layout</h3>
      <p>
        Generally, if a text form is placed within a modal, it should be measured
        in % and span to 100% of the width for it.
      </p>
      <p>
        If a text field is outside of a modal, it should have a "max-width" of
        400px.
      </p>
      <p>
        If there are multiple text fields, they should be stacked vertically, with
        even space between them. See Forms(Pattern) for implementation details.
      </p>

      <h3>Required fields</h3>
      <p>
        <!-- TBD -->
      </p>
    </div>

  </component-style-guide>

</template>


<script>

  // Globally register the Kolibri components to make them accessible in the
  // Vuep renderer. This has to be done on the compiler-included version of Vue
  // because that's what Vuep uses to dynamically render template.
  const FullVue = require('vue/dist/vue.common');
  FullVue.component('textbox', require('kolibri.coreVue.components.textbox'));

  // Define the examples as the initial content of the Vuep editor.
  // Notes: htmlhint would incorrectly warn about nested script tags, so we'd
  // need to work around it by dynamically constructing them.
  const script = 'script';
  const codeExamplesTemplate = `
<template>
  <div>

    <div class="text_field_example">
      <h4>Normal</h4>
      <div>
        <textbox
            floating-label
            label="Name"
            v-model="name">
        </textbox>
      </div>
    </div>

    <div class="text_field_example">
      <h4>Disabled</h4>
      <div>
        <textbox
            disabled
            floating-label
            label="Name"
            v-model="name">
        </textbox>
      </div>
    </div>

    <div class="text_field_example">
      <h4>With counter</h4>
      <div>
        <textbox
            error="Use at most 16 characters"
            label="Name"
            :maxlength="16"
            :invalid="nameWithMaxLength.length > 16"
            v-model="nameWithMaxLength">
        </textbox>
      </div>
    </div>

    <div class="text_field_example">
      <h4>With error</h4>
      <div>
        <textbox
            :invalid="true"
            :error="'Error'"
            label="Name"
            v-model="name">
        </textbox>
      </div>
    </div>

  </div>
</template>

<${script}>
  module.exports = {
    data: () => ({
      name: '',
      nameWithMaxLength: ''
    }),
    components: {
      // textbox: require('keen-ui/src/UiTextbox')
    }
  };
</${script}>

<style scoped>
  .text_field_example:not:first-child {
    margin-top: 2em;
  }
</style>
`;

  module.exports = {
    components: {
      'component-style-guide': require('../../shell/component-style-guide'),
    },
    data: () => ({
      codeExamplesTemplate,
      api: require('!vue-doc!kolibri.coreVue.components.textbox') // eslint-disable-line
    })
  };

</script>


<style lang="stylus">

  .text-fields-style-guide .vuep
    height: 100em

</style>
