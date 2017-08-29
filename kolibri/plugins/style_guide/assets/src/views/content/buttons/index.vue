<template>

  <page-template :completed="true">

    <h1>Buttons and links</h1>

    <h2>Button hierarchy</h2>
    <p>
      There are 3 main types of buttons. Each maps to a different level of
      visual hierarchy:
    </p>
    <ul>
      <li><strong>Raised buttons:</strong> more prominent actions</li>
      <li><strong>Flat buttons:</strong> less prominent actions, or actions that repeat in a list</li>
      <li><strong>Hyperlinks:</strong> very deemphasized actions, or actions inline within text</li>
    </ul>

    <show>
      <k-button text="Raised" :primary="true" :raised="true"></k-button>
      <k-button text="Flat" :primary="true" :raised="false"></k-button>
      <a href="#">Hyperlink</a>
    </show>

    <p>
      Buttons can also be <strong>primary</strong> or <strong>secondary</strong>. There should only be one primary button visible at a time, and it should be a common or default action.
    </p>

    <show>
      <k-button text="Primary" :primary="true" :raised="true"></k-button>
      <k-button text="Primary" :primary="true" :raised="false"></k-button>
      <k-button text="Secondary" :primary="false" :raised="true"></k-button>
      <k-button text="Secondary" :primary="false" :raised="false"></k-button>
    </show>

    <p>
      Note that there is no "secondary hyperlink".
    </p>

    <h2>Language and contents</h2>
    <ul>
      <li>Labels should typically have a single word, or two at most</li>
      <li>Avoid ambiguity; be specific about the action that will be performed. For example, use 'Save' instead of 'OK'</li>
      <li>Never use commas or other punctuation</li>
      <li>Do not add icons to buttons</li>
    </ul>

    <h2>Placement</h2>
    <ul>
      <li>Right-aligned in modal pop-ups</li>
      <li>Left-aligned in page forms</li>
      <li>Global actions related to tables should be put above the table and right-aligned</li>
    </ul>

    <h2>Button API</h2>
    <component-docs :api="kButtonApi" />
    <p>
      Note that hyperlinks are not created using the <code>&lt;k-button&gt;</code> component. Instead, they are created using a standard HTML <code>&lt;a href&gt;</code> tag, or a Vue.js <code>&lt;router-link&gt;</code> component (see <a href="https://router.vuejs.org/en/api/router-link.html">documentation</a>).
    </p>

    <h2>Interactive code example</h2>
    <vue-example :code="example" />

    <h2>Known exceptions</h2>
    <ul>
      <li>On the sign-in page, the "Sign In" button has a non-standard width for aesthetic reasons</li>
    </ul>

  </page-template>

</template>


<script>

  import componentDocs from '../../shell/component-docs';
  import vueExample from '../../shell/vue-example';
  import pageTemplate from '../../shell/page-template';
  import show from '../../shell/show';

  import example from 'raw-loader!./example.html';
  import kButtonApi from '!vue-doc!kolibri.coreVue.components.kButton';

  import FullVue from 'vue/dist/vue.common';
  import kButton from 'kolibri.coreVue.components.kButton';
  FullVue.component('k-button', kButton);

  export default {
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
      show,
      kButton,
    },
    data: () => ({
      kButtonApi,
      example,
    }),
  };

</script>


<style lang="stylus" scoped></style>
