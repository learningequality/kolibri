<template>

  <div>
    <h1>Buttons</h1>
    <p>
      Buttons initialize actions and communicate what will happen upon clicking
      them.
    </p>

    <table-of-contents></table-of-contents>

    <h2 id="guidelines-and-usage">Guidelines & Usage</h2>

    <h3>Scope</h3>
    <p>
      This is meant to cover 90% of buttons. There will always be edge cases,
      and common sense always trumps rote rules. Maintain consistency as much as
      possible, but don’t make significant sacrifices in the UX for the sake of
      consistency.
    </p>

    <h3>Types of buttons</h3>
    <p>
      There are 3 main types of buttons, each to map to a different level of
      visual hierarchy.
    </p>
    <ul>
      <li>Raised buttons for more prominent actions.</li>
      <li>Flat buttons for less prominent or actions that repeat in a list.</li>
      <li>Hyperlink text for very deemphasized actions or in paragraphs.</li>
    </ul>

    <h3>Dropdown buttons</h3>
    <p>
      In areas where multiple actions are necessary, raised or flat buttons can
      be made into dropdown buttons, which have multiple actions nested
      underneath them in a menu.
    </p>
    <p>
      The label on a dropdown button is not an action itself, but rather should
      label the group of actions that are nested under the button.
    </p>
    <p>
      If a single action is more important or prominent than the others, it can
      be brought out as its own individual button, next to the menu with more
      actions.
    </p>

    <h3>Language</h3>
    <p>
      Buttons should aim to have a single word in them, with two at most.
    </p>
    <p>
      The buttons language should avoid any ambiguity, be specific to the action
      you are completing. For example, use ‘Save’ instead of ‘OK’.
    </p>
    <p>
      Never use commas or other punctuation in buttons.
    </p>

    <h3>Color usage</h3>
    <p>
      Primary/affirmative actions should be purple.
    </p>
    <p>
      Secondary/cancel actions should be grey.
    </p>
    <p>
      Tertiary links should always use purple.
    </p>

    <h3>Button placement</h3>
    <p>
      Buttons should be right aligned in modals.
    </p>
    <p>
      Global actions on tables should be put above the table and right aligned.
    </p>
    <p>
      Deviates from these patterns are fine with common sense.
    </p>

    <h3>Iconography</h3>
    <p>
      Aside from the dropdown icon, there is no iconography in buttons.
    </p>

    <h3>Responsive</h3>
    <p>
      Buttons should be determined by the size of the text in them, with a min
      width. They should not generally transform based on the size of the page.
    </p>
    <p>
      Buttons should elide if you really really really have but pls don’t thx.
    </p>

    <h3>
      Details for devs (to be deleted after button component is implemented)
    </h3>
    <h4>Spacing</h4>
    <ul>
      <li>
        Height: 36
      </li>
      <li>
        Min width is 64
      </li>
      <li>
        Button length corresponds to text length + 16px padding on each side
      </li>
      <li>
        8px padding between buttons
      </li>
    </ul>
    <h4>Typography</h4>
    <ul>
      <li>14 pt</li>
      <li>Caps</li>
      <li>bold</li>
    </ul>
    <h4>Language</h4>
      <ul>
        <li>Buttons should be specific to action</li>
        <li>Ideally 1 word, no more than 2 words</li>
      </ul>
    <h4>Color usage</h4>
      <ul>
        <li>Use fushia for primary actions #996189</li>
        <li>Grey for secondary action or cancel #EEEEEE</li>
      </ul>
    <h4>Iconography</h4>
      <ul>
        <li>No iconography aside from dropdown carrot</li>
      </ul>
    <h4>Placement on page</h4>
      <ul>
        <li>Right aligned on modals</li>
        <li>Top right for major creation actions</li>
      </ul>

    <h2 id="code-examples">Code Examples</h2>

    <vuep class="code-examples" :template="codeExamplesTemplate"></vuep>

    <h2 id="api">API</h2>

    <!-- <api-table :api="api"></api-table> -->

  </div>

</template>


<script>

  // Globally register the Kolibri components to make them accessible in the
  // Vuep renderer. This has to be done on the compiler-included version of Vue
  // because that's what Vuep uses to dynamically render template.
  const FullVue = require('vue/dist/vue.common');
  FullVue.component('ui-button', require('keen-ui/src/UiButton'));

  // Define the examples as the initial content of the Vuep editor.
  // Notes: htmlhint would incorrectly warn about nested script tags, so we'd
  // need to work around it by dynamically constructing them.
  const script = 'script';
  const codeExamplesTemplate = `
<template>
  <div class="checkbox_examples">
    <div class="checkbox_examples_section">
      <h4>Raised</h4>
      <ui-button raised>Confirm</ui-button>
      <ui-button disabled>Confirm</ui-button>
    </div>

    <div class="checkbox_examples_section">
      <h4>Flat</h4>
      <ui-button>Confirm</ui-button>
      <ui-button disabled>Confirm</ui-button>
    </div>

    <div class="checkbox_examples_section">
      <h4>Link</h4>
      <ui-button type="secondary">Confirm</ui-button>
      <ui-button type="secondary" disabled>Confirm</ui-button>
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
      // textbox: require('keen-ui/src/UiCheckbox')
    }
  };
</${script}>

<style scoped>
  .checkbox_examples {
    display: flex;
  }
  .checkbox_examples_section {
    margin: 0 2em;
  }
</style>
`;

  module.exports = {
    data: () => ({ codeExamplesTemplate }),
    components: {
      'table-of-contents': require('../../shell/table-of-contents'),
    },
  };

</script>


<style lang="stylus">

  .code-examples.vuep
    .vuep-preview
      height: 40em

</style>
