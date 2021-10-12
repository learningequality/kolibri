<template>

  <Navbar>
    <NavbarLink
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
      v-if="showClassesLink"
      name="classes-link"
      :title="coreString('classesLabel')"
      :link="allClassesLink"
    >
      <KIcon
        icon="classes"
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
        icon="channel"
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

  import { mapGetters, mapState } from 'vuex';
  import Navbar from 'kolibri.coreVue.components.Navbar';
  import NavbarLink from 'kolibri.coreVue.components.NavbarLink';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ClassesPageNames, PageNames } from '../constants';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'LearnTopNav',
    components: {
      Navbar,
      NavbarLink,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    data() {
      return {
        homePageLink: {
          name: PageNames.HOME,
        },
        allClassesLink: {
          name: ClassesPageNames.ALL_CLASSES,
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
      ...mapState({
        userHasMemberships: state => state.memberships.length > 0,
      }),
      showClassesLink() {
        return this.isUserLoggedIn && (this.userHasMemberships || !this.canAccessUnassignedContent);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
