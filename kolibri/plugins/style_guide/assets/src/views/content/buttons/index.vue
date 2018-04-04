<template>

  <page-template :completed="true">

    <h1>Buttons and links</h1>

    <p>
      Buttons use the <code>&lt;button&gt;</code> HTML tag and trigger an action on the current
      page. Links use the <code>&lt;a&gt;</code> HTML tag and navigate to a new URL.
    </p>
    <p>
      Buttons and links are <em>not</em> visually distinguishable.
      Buttons can visually look like classic links,
      and links can visually look like classic buttons.
    </p>
    <p>
      When the user would expect to use navigation history, right-click to copy a URL,
      or control-click to open a page in a new tab, then a link should be used.
      Otherwise, a button should be used.
    </p>

    <h2>Visual styles</h2>
    <p>
      There are 3 main appearances of button and link components.
      (Remember that a button component can visually look like a link,
      and a link component can visually look like a button.)
      Each appearance maps to a different level of
      <a href="https://en.wikipedia.org/wiki/Visual_hierarchy">visual hierarchy</a>:
    </p>
    <ul>
      <li><strong>Raised buttons:</strong> button-like appearance for more prominent actions</li>
      <li><strong>Flat buttons:</strong> button-like appearance for less prominent actions</li>
      <li>
        <strong>Basic links:</strong>
        hyperlink-like appearance for deemphasized actions, or actions inline within text
      </li>
    </ul>

    <show>
      <k-button text="Raised button" :primary="true" appearance="raised-button" />
      <k-button text="Flat button" :primary="true" appearance="flat-button" />
      <k-button text="Basic link" :primary="true" appearance="basic-link" />
    </show>

    <p>
      Actions with a button-like appearance can also be <strong>primary</strong> or
      <strong>secondary</strong>. There should only be one primary button visible at a time,
      and it should be a common or default action.
    </p>

    <show>
      <k-button text="Primary" :primary="true" appearance="raised-button" />
      <k-button text="Secondary" :primary="false" appearance="raised-button" />
      <br>
      <k-button text="Primary" :primary="true" appearance="flat-button" />
      <k-button text="Secondary" :primary="false" appearance="flat-button" />
    </show>

    <p>
      Note that we don't use a "secondary basic link" style.
    </p>

    <h2>Label text</h2>
    <ul>
      <li>Labels should typically have a single word, or two at most</li>
      <li>
        Avoid ambiguity; be specific about the action that will be performed. For example,
        use 'Save' instead of 'OK'
      </li>
      <li>Never use commas or other punctuation</li>
      <li>Do not add icons to buttons</li>
    </ul>

    <h2>Placement of 'raised button' and 'flat button' actions</h2>
    <ul>
      <li>Right-aligned in modal pop-ups</li>
      <li>Left-aligned in page forms</li>
      <li>Global actions related to tables should be put above the table and right-aligned</li>
    </ul>

    <h2>APIs</h2>

    <p>There are three components that all look the same, but are used for different purposes:</p>
    <ul>
      <li>
        <code>kButton</code> is used to create <code>&lt;button&gt;</code> tags with
        <code>@click</code> event handlers.
      </li>
      <li>
        <code>kRouterLink</code> is used to create Vue router <code>&lt;router-link&gt;</code>
        components with <code>:to</code> properties. These compile into <code>&lt;a&gt;</code> tags.
      </li>
      <li>
        <code>kExternalLink</code> is used to create standard <code>&lt;a&gt;</code> tags with an
        <code>href</code> attribute.
      </li>
    </ul>

    <h3>kButton</h3>
    <component-docs :api="kButtonApi" />

    <h3>kRouterLink</h3>
    <component-docs :api="kRouterLinkApi" />

    <h3>kExternalLink</h3>
    <component-docs :api="kExternalLinkApi" />

    <h2>Interactive code example</h2>
    <vue-example :code="example" />

    <h2>Known exceptions</h2>
    <ul>
      <li>
        On the sign-in page, the primary button is wider for aesthetic
        reasons. Also, the secondary buttons are inverted to reduce contrast
        with the dark background.
      </li>
    </ul>

  </page-template>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kExternalLink from 'kolibri.coreVue.components.kExternalLink';
  import componentDocs from '../../shell/component-docs';
  import vueExample from '../../shell/vue-example';
  import pageTemplate from '../../shell/page-template';
  import show from '../../shell/show';

  import example from 'raw-loader!./example.html';
  import kButtonApi from '!vue-doc!kolibri.coreVue.components.kButton';
  import kRouterLinkApi from '!vue-doc!kolibri.coreVue.components.kRouterLink';
  import kExternalLinkApi from '!vue-doc!kolibri.coreVue.components.kExternalLink';

  FullVue.component('k-button', kButton);
  FullVue.component('k-router-link', kRouterLink);
  FullVue.component('k-external-link', kExternalLink);

  export default {
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
      show,
      kButton,
      kRouterLink,
      kExternalLink,
    },
    data: () => ({
      kButtonApi,
      kRouterLinkApi,
      kExternalLinkApi,
      example,
    }),
  };

</script>


<style lang="stylus" scoped></style>
