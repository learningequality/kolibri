<template>

  <component-style-guide
      class="tab-style-guide"
      :codeExamplesTemplate="codeExamplesTemplate"
      :api="api"
      :requirePath="requirePath">

    <h1 slot="title">Top nav tabs</h1>
    <p slot="summary">
      At a high level, top nav tabs allow the user to switch between different
      views, data sets or functions of Kolibri.
    </p>

    <div slot="guidelines-and-usage">

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
  </component-style-guide>

</template>


<script>

  // Globally register the Kolibri components to make them accessible in the
  // Vuep renderer. This has to be done on the compiler-included version of Vue
  // because that's what Vuep uses to dynamically render template.
  import FullVue from 'vue/dist/vue.common';
  import componentStyleGuide from '../../shell/component-style-guide';
  import tabs from 'kolibri.coreVue.components.tabs';
  import tabLink from 'kolibri.coreVue.components.tabLink';
  import tabLinkApi from '!vue-doc!kolibri.coreVue.components.tabLink';
  FullVue.component('tabs', tabs);
  FullVue.component('tab-link', tabLink);

  // Define the examples as the initial content of the Vuep editor.
  // Notes: htmlhint would incorrectly warn about nested script tags, so we'd
  // need to work around it by dynamically constructing them.
  const script = 'script';
  const codeExamplesTemplate = `
  <template>
  <tabs>
    <tab-link
      type="icon-and-title"
      :title="$tr('topics')"
      icon="folder"
      :link="topicsLink">
    </tab-link>
    <tab-link
      type="icon-and-title"
      :title="$tr('recent')"
      icon="access_time"
      :link="recentLink">
    </tab-link>
    <tab-link
      type="icon-and-title"
      :title="$tr('learners')"
      icon="people"
      :link="learnersLink">
    </tab-link>
    <tab-link
      type="icon-and-title"
      :title="$tr('groups')"
      icon="group_work"
      :link="groupsLink">
    </tab-link>
    <tab-link
      type="icon-and-title"
      :title="$tr('exams')"
      icon="assignment_late"
      :link="examsLink">
    </tab-link>
  </tabs>
  </template>

  <${script}>
  module.exports = {
    data: () => ({
    }),
    computed: {
      topicsLink: function() { return { path: this.$route.path } },
      recentLink: function() { return { path: this.$route.path + 'foo' } },
      learnersLink: function() { return { path: this.$route.path + 'foo' } },
      groupsLink: function() { return { path: this.$route.path + 'foo' } },
      examsLink: function() { return { path: this.$route.path + 'foo' } },
    },
    components: {
      // 'tabs': require('kolibri.coreVue.components.tabs'),
      // 'tab-link': require('kolibri.coreVue.components.tabLink'),
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
      api: tabLinkApi,
      requirePath: 'kolibri.coreVue.components.tabLink',
    }),
  };

</script>


<style lang="stylus">

  .tab-style-guide
    .vuep-preview
      height: 170px

</style>
