<template>

  <page-template :completed="true">

    <h1>Horizontal Navbar</h1>

    <p>
      The horizontal navbar should be the primary means of navigating between
      sub-pages of top-level sections (app plugins) of Kolibri.
    </p>

    <p>
      Navbar links use information from vue router to determine which one is
      visually selected.
    </p>

    <show>
      <k-navbar>
        <k-navbar-link
          type="icon-and-title"
          title="Trending"
          icon="trending_up"
          :link="a" />
        <k-navbar-link
          type="icon-and-title"
          title="Lit"
          icon="whatshot"
          :link="b" />
        <k-navbar-link
          type="icon-and-title"
          title="Favorites"
          icon="favorite"
          :link="c" />
      </k-navbar>
    </show>

    <h2>Usage guidelines</h2>

    <p>Text for navbar items should ideally be a single, short word.</p>

    <h2>Component APIs</h2>

    <h3>Navbar</h3>
    <component-docs :api="kNavbarApi" />

    <h3>Navbar Link</h3>
    <component-docs :api="kNavbarLinkApi" />

    <h2>Code Example</h2>
    <vue-example :code="example" />

  </page-template>

</template>


<script>

  import componentDocs from '../../shell/component-docs';
  import vueExample from '../../shell/vue-example';
  import pageTemplate from '../../shell/page-template';
  import show from '../../shell/show';

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
      kNavbarLink,
      kNavbar,
      show,
    },
    data: () => ({
      kNavbarApi,
      kNavbarLinkApi,
      example,
    }),
    computed: {
      a() {
        return {};
      },
      b() {
        return { path: '#' };
      },
      c() {
        return { path: '#' };
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
