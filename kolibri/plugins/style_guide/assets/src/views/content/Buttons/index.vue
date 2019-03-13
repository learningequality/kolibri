<template>

  <PageTemplate :completed="true">

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

    <Show>
      <KButton text="Raised button" :primary="true" appearance="raised-button" />
      <KButton text="Flat button" :primary="true" appearance="flat-button" />
      <KButton text="Basic link" :primary="true" appearance="basic-link" />
    </Show>

    <p>
      Actions with a button-like appearance can also be <strong>primary</strong> or
      <strong>secondary</strong>. There should only be one primary button visible at a time,
      and it should be a common or default action.
    </p>

    <Show>
      <KButton text="Primary" :primary="true" appearance="raised-button" />
      <KButton text="Secondary" :primary="false" appearance="raised-button" />
      <br>
      <KButton text="Primary" :primary="true" appearance="flat-button" />
      <KButton text="Secondary" :primary="false" appearance="flat-button" />
    </Show>

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
        <code>KButton</code> is used to create <code>&lt;button&gt;</code> tags with
        <code>@click</code> event handlers.
      </li>
      <li>
        <code>KRouterLink</code> is used to create Vue router <code>&lt;router-link&gt;</code>
        components with <code>:to</code> properties. These compile into <code>&lt;a&gt;</code> tags.
      </li>
      <li>
        <code>KExternalLink</code> is used to create standard <code>&lt;a&gt;</code> tags with an
        <code>href</code> attribute.
      </li>
    </ul>

    <h3>KButton</h3>
    <ComponentDocs :api="KButtonApi" />

    <h3>KRouterLink</h3>
    <ComponentDocs :api="KRouterLinkApi" />

    <h3>KExternalLink</h3>
    <ComponentDocs :api="KExternalLinkApi" />

    <h2>Code example</h2>
    <VueExample :code="exampleCode">
      <Example />
    </VueExample>

    <h2>Known exceptions</h2>
    <ul>
      <li>
        On the sign-in page, the primary button is wider for aesthetic
        reasons. Also, the secondary buttons are inverted to reduce contrast
        with the dark background.
      </li>
    </ul>

  </PageTemplate>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';
  import Show from '../../shell/Show';

  /* eslint-disable import/no-duplicates */
  import exampleCode from '!!raw-loader!./Example.vue';
  import Example from './Example';
  /* eslint-enable import/no-duplicates */

  import KButtonApi from '!vue-doc!kolibri.coreVue.components.KButton';
  import KRouterLinkApi from '!vue-doc!kolibri.coreVue.components.KRouterLink';
  import KExternalLinkApi from '!vue-doc!kolibri.coreVue.components.KExternalLink';

  export default {
    name: 'Buttons',
    components: {
      PageTemplate,
      ComponentDocs,
      VueExample,
      Show,
      KButton,
      Example,
    },
    data() {
      return {
        KButtonApi,
        KRouterLinkApi,
        KExternalLinkApi,
        exampleCode,
      };
    },
  };

</script>


<style lang="scss" scoped></style>
