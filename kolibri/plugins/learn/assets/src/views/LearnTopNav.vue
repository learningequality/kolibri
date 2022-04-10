<template>

  <Navbar>
    <NavbarLink
      v-if="isUserLoggedIn"
      :title="coreString('homeLabel')"
      :link="homePageLink"
    >
      <KIcon
        icon="dashboard"
        style="top: 0; width: 24px; height: 24px;"
        :color="$themeTokens.textInverted"
      />
    </NavbarLink>
    <NavbarLink
      v-if="canAccessUnassignedContent"
      :title="learnString('libraryLabel')"
      :link="libraryLink"
    >
      <!-- todo update icon -->
      <KIcon
        icon="library"
        style="top: 0; width: 24px; height: 24px;"
        :color="$themeTokens.textInverted"
      />
    </NavbarLink>
    <NavbarLink
      v-if="isUserLoggedIn && canAccessUnassignedContent"
      :title="coreString('bookmarksLabel')"
      :link="bookmarksLink"
    >
      <KIcon
        icon="bookmark"
        style="top: 0; width: 24px; height: 24px;"
        :color="$themeTokens.textInverted"
      />
    </NavbarLink>
  </Navbar>

</template>


<script>

  import { mapGetters } from 'vuex';
  import Navbar from 'kolibri.coreVue.components.Navbar';
  import NavbarLink from 'kolibri.coreVue.components.NavbarLink';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../constants';
  import useCoreLearn from '../composables/useCoreLearn';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'LearnTopNav',
    components: {
      Navbar,
      NavbarLink,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup() {
      const { inClasses } = useCoreLearn();
      return {
        inClasses,
      };
    },
    data() {
      return {
        homePageLink: {
          name: PageNames.HOME,
        },
        libraryLink: {
          name: PageNames.LIBRARY,
        },
        bookmarksLink: {
          name: PageNames.BOOKMARKS,
        },
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'canAccessUnassignedContent']),
    },
  };

</script>


<style lang="scss" scoped></style>
