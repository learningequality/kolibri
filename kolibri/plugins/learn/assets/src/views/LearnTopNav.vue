<template>

  <Navbar>
    <NavbarLink
      v-if="showClassesLink"
      name="classes-link"
      :title="coreString('classesLabel')"
      :link="allClassesLink"
    >
      <KIcon
        icon="classroom"
        style="top: 0; width: 24px; height: 24px;"
        :color="$themeTokens.textInverted"
      />
    </NavbarLink>
    <NavbarLink
      v-if="canAccessUnassignedContent"
      :title="coreString('channelsLabel')"
      :link="channelsLink"
    >
      <KIcon
        icon="channel"
        style="top: 0; width: 24px; height: 24px;"
        :color="$themeTokens.textInverted"
      />
    </NavbarLink>
    <NavbarLink
      v-if="canAccessUnassignedContent"
      :title="learnString('recommendedLabel')"
      :link="recommendedLink"
    >
      <KIcon
        icon="forum"
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
    props: {},
    data() {
      return {
        allClassesLink: {
          name: ClassesPageNames.ALL_CLASSES,
        },
        channelsLink: {
          name: PageNames.TOPICS_ROOT,
        },
        recommendedLink: {
          name: PageNames.RECOMMENDED,
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
    methods: {},
  };

</script>


<style lang="scss" scoped></style>
