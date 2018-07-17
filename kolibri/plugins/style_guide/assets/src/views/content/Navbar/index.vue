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
          :link="a"
        >
          <mat-svg name="trending_up" category="action" />
        </k-navbar-link>
        <k-navbar-link
          type="icon-and-title"
          title="Lit"
          :link="b"
        >
          <mat-svg name="whatshot" category="social" />
        </k-navbar-link>
        <k-navbar-link
          type="icon-and-title"
          title="Favorites"
          :link="c"
        >
          <mat-svg name="favorite" category="action" />
        </k-navbar-link>
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

  import FullVue from 'vue/dist/vue.common';
  import KNavbar from 'kolibri.coreVue.components.KNavbar';
  import KNavbarLink from 'kolibri.coreVue.components.KNavbarLink';
  import componentDocs from '../../shell/ComponentDocs';
  import vueExample from '../../shell/VueExample';
  import pageTemplate from '../../shell/PageTemplate';
  import show from '../../shell/Show';
  import example from 'raw-loader!./example.html';
  import kNavbarApi from '!vue-doc!kolibri.coreVue.components.KNavbar';
  import kNavbarLinkApi from '!vue-doc!kolibri.coreVue.components.KNavbarLink';

  FullVue.component('k-navbar', KNavbar);
  FullVue.component('k-navbar-link', KNavbarLink);

  export default {
    name: 'Navbar',
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
      KNavbarLink,
      KNavbar,
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


<style lang="scss" scoped></style>
