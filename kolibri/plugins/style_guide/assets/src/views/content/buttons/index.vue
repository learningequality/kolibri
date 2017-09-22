<template>

  <page-template :completed="true">

    <h1>Buttons and links</h1>

    <p>
      Buttons use the <code>&lt;button&gt;</code> HTML tag and trigger an action on the current page. Links use the <code>&lt;a&gt;</code> HTML tag and navigate to a new URL.
    </p>
    <p>
      If the user would expect to use navigation history, right-click to copy a URL, or control-click to open a page in a new tab, then a link with an associated URL or route should be used. Otherwise, a button should be used.
    </p>
    <p>
      Buttons and links are <em>not</em> visually distinguishable. Buttons look like classic underlined hyperlinks, and links can look like classic buttons.
    </p>

    <h2>Hierarchy</h2>
    <p>
      There are 3 main types of button and links. Each maps to a different level of
      visual hierarchy:
    </p>
    <ul>
      <li><strong>Raised:</strong> more prominent actions</li>
      <li><strong>Flat:</strong> less prominent actions, or actions that repeat in a list</li>
      <li><strong>Link:</strong> very deemphasized actions, or actions inline within text</li>
    </ul>

    <show>
      <k-button text="Raised" :primary="true" appearance="raised"></k-button>
      <k-button text="Flat" :primary="true" appearance="flat"></k-button>
      <k-button text="Link" :primary="true" appearance="link"></k-button>
    </show>

    <p>
      Buttons can also be <strong>primary</strong> or <strong>secondary</strong>. There should only be one primary button visible at a time, and it should be a common or default action.
    </p>

    <show>
      <k-button text="Primary" :primary="true" appearance="raised"></k-button>
      <k-button text="Primary" :primary="true" appearance="flat"></k-button>
      <br>
      <k-button text="Secondary" :primary="false" appearance="raised"></k-button>
      <k-button text="Secondary" :primary="false" appearance="flat"></k-button>
    </show>

    <p>
      Note that we don't use a "secondary link" style.
    </p>

    <h2>Label text</h2>
    <ul>
      <li>Labels should typically have a single word, or two at most</li>
      <li>Avoid ambiguity; be specific about the action that will be performed. For example, use 'Save' instead of 'OK'</li>
      <li>Never use commas or other punctuation</li>
      <li>Do not add icons to buttons</li>
    </ul>

    <h2>Placement of 'raised' and 'flat' buttons</h2>
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
