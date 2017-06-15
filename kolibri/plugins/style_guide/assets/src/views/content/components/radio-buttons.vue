<template>

  <component-style-guide
    class="radio-style-guide"
    :codeExamplesTemplate="codeExamplesTemplate"
    :api="api"
    :requirePath="requirePath"
  >

    <h1 slot="title">Radio Buttons</h1>
    <p slot="summary">
      Radio buttons allow the selection of a single option from a set of 3 or
      more options.
    </p>

    <div slot="guidelines-and-usage">

      <h3>Usage</h3>
      <p>
        In particular, radio buttons aid the user when they need to see all
        available options side-by-side.
      </p>
      <p>
        If it is not necessary to see all available options, a dropdown may be
        used.
      </p>
      <p>
        Selected state of controls generally denote "positives"
        (yes/selected/etc.)
      </p>

      <h3>Do not</h3>
      <ul>
        <li>
          Use radio buttons as a filter in a table or a list.
        </li>
        <li>
          Nest radio buttons.
        </li>
      </ul>

      <h3>Style</h3>
      <p>
        Kolibri utilizes the default styles + padding from Keen UI.
      </p>
      <p>
        Selected option is the action color, other available options are dark
        grey.
      </p>
      <p>
        Where possible, avoid using icons with radio buttons. If necessary, the
        icon should sit within the label area, pushing the label to the right.
      </p>

      <h3>Language</h3>
      <h4>Labels & option text:</h4>
      <p>
        Keep these short, concise, and easy for the user to understand. Should not
        be structured as a sentence.
      </p>

      <h3>Layout</h3>
      <p>
        Radio buttons are always left-aligned.
      </p>
      <p>
        No inset padding, radio buttons left-align with the content of their
        container.
      </p>
      <p>
        Radio buttons are vertically stacked.
      </p>
    </div>
  </component-style-guide>

</template>


<script>

  // Globally register the Kolibri components to make them accessible in the
  // Vuep renderer. This has to be done on the compiler-included version of Vue
  // because that's what Vuep uses to dynamically render template.
  const FullVue = require('vue/dist/vue.common');
  FullVue.component('ui-radio', require('keen-ui/src/UiRadio'));

  // Define the examples as the initial content of the Vuep editor.
  // Notes: htmlhint would incorrectly warn about nested script tags, so we'd
  // need to work around it by dynamically constructing them.
  const script = 'script';
  const codeExamplesTemplate = `
<template>
  <div class="examples">
    <div class="example">
      <h4>Normal</h4>
      <ui-radio v-model="value" true-value="1">
        Orange
      </ui-radio>
      <ui-radio v-model="value" true-value="2">
        Apple
      </ui-radio>
    </div>

    <div class="example">
      <h4>Disabled</h4>
      <ui-radio :disabled="true" v-model="value" :true-value="1">
        Orange
      </ui-radio>
      <ui-radio :disabled="true" v-model="value" :true-value="2">
        Apple
      </ui-radio>
    </div>
  </div>
</template>

<${script}>
  module.exports = {
    data: () => ({
      value: '1',
    }),
    components: {
      // textbox: require('keen-ui/src/UiRadio')
    }
  };
</${script}>
`;

  module.exports = {
    components: {
      'component-style-guide': require('../../shell/component-style-guide'),
    },
    data: () => ({
      codeExamplesTemplate,
      api: require('!vue-doc!keen-ui/src/UiRadio'), // eslint-disable-line
      requirePath: 'keen-ui/src/UiRadio',
    })
  };

</script>


<style lang="stylus">

  .radio-style-guide
    .vuep-preview
      height: 20em

    .examples
      display: flex

      .example
        margin: 0 5em

      .ui-radio
        padding: 1em

</style>
