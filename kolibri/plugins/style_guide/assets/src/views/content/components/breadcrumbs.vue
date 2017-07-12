<template>

  <component-style-guide
      class="breadcrumb-style-guide"
      :codeExamplesTemplate="codeExamplesTemplate"
      :api="api"
      :requirePath="requirePath">

    <h1 slot="title">Breadcrumbs</h1>
    <p slot="summary">
      Include breadcrumbs whenever the topic tree is introduced within a
      Kolibri page
    </p>

    <div slot="guidelines-and-usage">

      <h3>When & where to use</h3>
      <ul>
        <li>
          Use with any instance of the topic tree
        </li>
        <li>
          Intentionally scoping out other navigational use cases for now
        </li>
        <li>
          Should always be directly above the content intended to navigate
          through
        </li>
        <li>
          Should include the current item/location, which does not require a
          link
        </li>
      </ul>

      <h3>Specs to be referenced & deleted</h3>
      <ul>
        <li>
          Max length on a breadcrumb item: 300px
        </li>
        <li>
          Same as paragraph text: 16px
        </li>
        <li>
          8px spacing before and after each "&gt;" arrow
        </li>
        <li>
          No background color
        </li>
        <li>
          All Breadcrumb items are bolded
        </li>
        <li>
          Links are underlined
        </li>
        <li>
          Current breadcrumb will be #3a3a3a
        </li>
        <li>
          Top-margin 24px
        </li>
        <li>
          Bottom-margin 24px
        </li>
      </ul>

      <h3>Responsive behaviors</h3>
      <ul>
        <li>
          Always display the current/item. Truncate if necessary.
        </li>
        <li>
          If breadcrumbs do not fit, they are pushed into the dropdown
        </li>
        <li>
          Dropdown will organize the breadcrumbs vertically with the first crumb
          being at the bottom to most recent item at the top
        </li>
        <li>
          No horizontal scrolling of any kind
        </li>
        <li>
          Dropdown max width determines itself via the longest item in the
          breadcrumb aka 300px
        </li>
      </ul>
    </div>
  </component-style-guide>

</template>


<script>

  // Globally register the Kolibri components to make them accessible in the
  // Vuep renderer. This has to be done on the compiler-included version of Vue
  // because that's what Vuep uses to dynamically render template.
  import FullVue from 'vue/dist/vue.common';
  import componentStyleGuide from '../../shell/component-style-guide';
  import UiIcon from 'keen-ui/src/UiIcon';

  FullVue.component('ui-icon', UiIcon);

  // Define the examples as the initial content of the Vuep editor.
  // Notes: htmlhint would incorrectly warn about nested script tags, so we'd
  // need to work around it by dynamically constructing them.
  const script = 'script';
  const codeExamplesTemplate = `
  <template>
  <div>
    <router-link :to="topicsLink">
      <span>{{ $tr('Topics') }}</span>
    </router-link>
    <ui-icon>navigate_next</ui-icon>
    <router-link :to="decimalLink">
      <span>{{ $tr('Decimal') }}</span>
    </router-link>
    <ui-icon>navigate_next</ui-icon>
    <router-link :to="decimalAddLink">
      <span>{{ $tr('Decimal Addition') }}</span>
    </router-link>
  </div>
  </template>

  <${script}>
  module.exports = {
    data: () => ({
    }),
    computed: {
      topicsLink: function() { return { path: this.$route.path + '_' } },
      decimalLink: function() { return { path: this.$route.path + '_' } },
      decimalAddLink: function() { return { path: this.$route.path } },
    }
  };
  </${script}>
  `;

  export default {
    components: {
      componentStyleGuide,
    },
    data: () => ({
      codeExamplesTemplate,
    }),
  };

</script>


<style lang="stylus">

  .breadcrumb-style-guide
    .vuep
      height: 630px

    .vuep-preview
      height: 100px

      .router-link-active
        color: #222
        text-decoration: none
        cursor: default

      .ui-icon
        font-size: 1em

</style>
