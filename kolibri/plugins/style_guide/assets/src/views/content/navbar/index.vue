<template>

  <page-template title="Horizontal Navbar" :completed="false">
    <h2>Component APIs</h2>
    <h3><code>{{ kNavbarApi.name }}</code></h3>
    <component-docs :api="kNavbarApi" />
    <h3><code>{{ kNavbarLinkApi.name }}</code></h3>
    <component-docs :api="kNavbarLinkApi" />

    <h2>Code Example</h2>
    <vue-example :code="example" />

    <h2>Guidelines</h2>

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

  </page-template>

</template>


<script>

  import componentDocs from '../../shell/component-docs';
  import vueExample from '../../shell/vue-example';
  import pageTemplate from '../../shell/page-template';

  import example from 'raw-loader!./example.html';
  import kNavbarApi from '!vue-doc!kolibri.coreVue.components.kNavbar';
  import kNavbarLinkApi from '!vue-doc!kolibri.coreVue.components.kNavbarLink';

  import FullVue from 'vue/dist/vue.common';
  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  FullVue.component('k-navbar', kNavbar);
  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
  FullVue.component('k-navbar-link', kNavbarLink);

  export default {
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
    },
    data: () => ({
      kNavbarApi,
      kNavbarLinkApi,
      example,
    }),
  };

</script>


<style lang="stylus" scoped></style>
