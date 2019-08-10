<template>

  <PageTemplate>

    <PageSection title="Overview" anchor="#overview">
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
    </PageSection>

    <PageSection title="Visual styles" anchor="#visualstyles">

      <p>
        There are 3 main appearances of button and link components.
        (Remember that a button component can visually look like a link,
        and a link component can visually look like a button.)
        Each appearance maps to a different level of
        <ExternalLink href="https://en.wikipedia.org/wiki/Visual_hierarchy" text="visual hierarchy" />:
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
    </PageSection>
    <PageSection title="Label text" anchor="#labels">
      <ul>
        <li>Labels should typically have a single word, or two at most</li>
        <li>
          Avoid ambiguity; be specific about the action that will be performed. For example,
          use 'Save' instead of 'OK'
        </li>
        <li>Never use commas or other punctuation</li>
        <li>Do not add icons to buttons</li>
      </ul>
    </PageSection>

    <PageSection title="Placement" anchor="#placement">
      <p>
        We have some conventions regarding placement of 'raised button' and
        'flat button' actions:
      </p>
      <ul>
        <li>Right-aligned in modal pop-ups</li>
        <li>Left-aligned in page forms</li>
        <li>Global actions related to tables should be put above the table and right-aligned</li>
      </ul>

    </PageSection>
    <PageSection title="Usage" anchor="#usage" fullwidth>

      <p>There are three components that all look the same, but are used for different purposes:</p>
      <ul>
        <li>
          <code>KButton</code> is used to create <code>&lt;button&gt;</code> tags with
          <code>@click</code> event handlers.
        </li>
        <li>
          <code>KRouterLink</code> is used to create Vue router <code>&lt;router-link&gt;</code>
          components with <code>:to</code> properties. These compile into <code>&lt;a&gt;</code>
          tags.
        </li>
        <li>
          <code>KExternalLink</code> is used to create standard <code>&lt;a&gt;</code> tags with an
          <code>href</code> attribute.
        </li>
      </ul>

      <VueExample :code="exampleCode">
        <Example />
      </VueExample>

    </PageSection>

    <PageSection title="Exceptions" anchor="#exceptions">
      <ul>
        <li>
          On the sign-in page, the primary button is wider to give it visual dominance
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
  import ExternalLink from '../../common/ExternalLink';

  /* eslint-disable import/no-duplicates */
  import Example from './Example';
  import exampleCode from '!!raw-loader!./Example.vue';
  /* eslint-enable import/no-duplicates */

  export default {
    name: 'Buttons',
    components: {
      PageTemplate,
      PageSection,
      VueExample,
      Show,
      Example,
      ExternalLink,
    },
    data() {
      return {
        exampleCode,
      };
    },
  };

</script>


<style lang="scss" scoped></style>
