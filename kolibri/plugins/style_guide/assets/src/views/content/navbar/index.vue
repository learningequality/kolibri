<template>

  <component-template :codeExamplesTemplate="example" :api="api" status="complete">
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
  import api from '!vue-doc!kolibri.coreVue.components.kNavbar';
  FullVue.component('k-navbar', kNavbar);
  import example from 'raw-loader!./example.html';

  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
  FullVue.component('k-navbar-link', kNavbarLink);

  export default {
    components: {
      componentTemplate,
    },
    data: () => ({
      api,
      example,
    }),
  };

</script>


<style lang="stylus"></style>
