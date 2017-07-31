<template>

  <component-template :codeExamplesTemplate="kTabsExample" :api="kTabsApi" status="complete">
    <div slot="guidelines">

      <h3>Usage</h3>
      <ul>
        <li>Should be the primary means of navigation within a plugin.</li>
        <li>Should appear in all user-facing plugins.</li>
        <li>If there exists an appropriate icon for each navbar item, then use them. Else, stick to text only navbar items.</li>
        <li>Text for navbar items should ideally be kept to one word. Two if really necessary.</li>
        <li>Should not be nested.</li>
      </ul>

      <h3>Responsiveness</h3>
      <ul>
        <li>Horizontally scrolls if all items do not fit within parent's width.</li>
      </ul>

    </div>
  </component-template>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import componentTemplate from '../../shell/component-template';
  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import kTabsApi from '!vue-doc!kolibri.coreVue.components.kNavbar';
  FullVue.component('k-navbar', kNavbar);
  import kTabsExample from 'raw-loader!./k-navbar-example.html';

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
