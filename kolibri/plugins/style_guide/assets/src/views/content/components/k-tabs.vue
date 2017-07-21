<template>

  <component-template :codeExamplesTemplate="kTabsExample" :api="kTabsApi" status="complete">
    <div slot="guidelines">
      <h3>When & where to use</h3>
      <ul>
        <li>
          Include topnav tabs as the high level, primary means of navigation
          through Kolibri
        </li>
        <li>
          Use topnav tabs in all plugins, including Learn, Coach, Manage,
          Profile, and search
        </li>
        <li>
          For each tab, couple icons and text together to succinctly describe
          each tab’s purpose
        </li>
        <li>
          If there are no icons available for a tab, use tabs with text only for
          the entire topnav
        </li>
      </ul>

      <h3>Screen/Responsive behaviors</h3>
      <ul>
        <li>
          On mobile, users can horizontally scroll through the topnav
        </li>
        <li>
          Reconsider information architecture before considering implementing a
          new tab
        </li>
        <li>
          Keep each tab text label short (1, but at most 2 words)
        </li>
        <li>
          Truncate the topnav once you reach max-width
        </li>
        <li>
          Highlight the appropriate tab according to the content on page
        </li>
        <li>
          Tabs should not be nested
        </li>
      </ul>

      <h3>Specs to be referenced & deleted</h3>
      <ul>
        <li>
          Tab iconography and text should be center aligned
        </li>
        <li>
          On all screen sizes, tabs have a max width of 264px
        </li>
        <li>
          On all screen sizes, tabs have a min width of 72px
        </li>
        <li>
          Padding under tab text labels: 16px
        </li>
        <li>
          Padding between text labels & icon: 10px
        </li>
        <li>
          Padding on the left and right of text labels: 24px
        </li>
        <li>
          Tab underline indicator should have the width of the entire tab
        </li>
        <li>
          Text labels are all caps
        </li>
        <li>
          Overall tab height: 72px
        </li>
        <li>
          Icon width: 24x24px
        </li>
      </ul>

    </div>
  </component-template>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import componentTemplate from '../../shell/component-template';
  import kTabs from 'kolibri.coreVue.components.kTabs';
  import kTabsApi from '!vue-doc!kolibri.coreVue.components.kTabs';
  FullVue.component('k-tabs', kTabs);
  import kTabsExample from 'raw-loader!./k-tabs-example.html';

  import tabLink from 'kolibri.coreVue.components.tabLink';
  FullVue.component('tab-link', tabLink);

  export default {
    components: {
      componentTemplate,
    },
    data: () => ({
      kTabsApi,
      kTabsExample,
    }),
  };

</script>


<style lang="stylus"></style>
