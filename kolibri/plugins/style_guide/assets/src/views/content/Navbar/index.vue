<template>

  <PageTemplate>


    <PageSection>
      <h1>Horizontal Navbar</h1>

      <p>
        The horizontal navbar should be the primary means of navigating between
        sub-pages of top-level sections (app plugins) of Kolibri.
      </p>

      <p>
        Navbar links use information from vue router to determine which one is
        visually selected.
      </p>

      <Show>
        <KNavbar>
          <KNavbarLink
            title="Trending"
            :link="a"
          >
            <mat-svg name="trending_up" category="action" />
          </KNavbarLink>
          <KNavbarLink
            title="Lit"
            :link="b"
          >
            <mat-svg name="whatshot" category="social" />
          </KNavbarLink>
          <KNavbarLink
            title="Favorites"
            :link="c"
          >
            <mat-svg name="favorite" category="action" />
          </KNavbarLink>
        </KNavbar>
      </Show>

      <h2>Usage guidelines</h2>

      <p>Text for navbar items should ideally be a single, short word.</p>

      <h2>Component APIs</h2>

      <h3>Navbar</h3>
      <ComponentDocs :api="kNavbarApi" />

      <h3>Navbar Link</h3>
      <ComponentDocs :api="kNavbarLinkApi" />

      <h2>Code Example</h2>
      <VueExample :code="exampleCode" alwaysStack>
        <Example />
      </VueExample>

    </PageSection>
  </PageTemplate>

</template>


<script>

  import KNavbar from 'kolibri.coreVue.components.KNavbar';
  import KNavbarLink from 'kolibri.coreVue.components.KNavbarLink';
  import ComponentDocs from '../../shell/ComponentDocs';
  import VueExample from '../../shell/VueExample';
  import PageTemplate from '../../shell/PageTemplate';
  import PageSection from '../../shell/PageTemplate/PageSection';
  import Show from '../../shell/Show';
  /* eslint-disable import/no-duplicates */
  import Example from './Example.vue';
  import exampleCode from '!!raw-loader!./Example.vue';
  /* eslint-enable import/no-duplicates */

  import kNavbarApi from '!vue-doc!kolibri.coreVue.components.KNavbar';
  import kNavbarLinkApi from '!vue-doc!kolibri.coreVue.components.KNavbarLink';

  export default {
    name: 'Navbar',
    components: {
      PageTemplate,
      PageSection,
      ComponentDocs,
      VueExample,
      KNavbarLink,
      KNavbar,
      Show,
      Example,
    },
    data: () => ({
      kNavbarApi,
      kNavbarLinkApi,
      exampleCode,
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
