<template>

  <div>
    <h1>Radio Buttons</h1>
    <p>
      Radio buttons allow the selection of a single option from a set of 3 or
      more options.
    </p>

    <h2>Guidelines & Usage</h2>

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

    <vuep class="code-examples" :template="codeExamplesTemplate"></vuep>
  </div>

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
  <div class="checkbox_examples">
    <div class="checkbox_examples_section">
      <h4>Normal</h4>
      <ui-radio v-model="selected" :true-value="true"></ui-radio>
      <ui-radio v-model="unselected" :true-value="true"></ui-radio>
    </div>

    <div class="checkbox_examples_section">
      <h4>Disabled</h4>
      <ui-radio :disabled="true" v-model="selected" :true-value="true">
      </ui-radio>
      <ui-radio :disabled="true" v-model="unselected" :true-value="true">
      </ui-radio>
    </div>
  </div>
</template>

<${script}>
  module.exports = {
    data: () => ({
      selected: true,
      unselected: false
    }),
    components: {
      // textbox: require('keen-ui/src/UiRadio')
    }
  };
</${script}>

<style scoped>
  .checkbox_examples {
    display: flex;
  }
  .checkbox_examples_section {
    margin: 0 5em;
  }
</style>
`;

  module.exports = {
    data: () => ({ codeExamplesTemplate })
  };

</script>


<style lang="stylus" scoped>

  .code-examples
    height: 530px

</style>
