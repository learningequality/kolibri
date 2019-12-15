<template>

  <Navbar>
    <NavbarLink
      v-if="showClassesLink"
      name="classes-link"
      :title="coreString('classesLabel')"
      :link="allClassesLink"
    >
      <mat-svg
        name="business"
        category="communication"
      />
    </NavbarLink>
    <NavbarLink
      v-if="canAccessUnassignedContent"
      :title="coreString('channelsLabel')"
      :link="channelsLink"
    >
      <mat-svg
        name="apps"
        category="navigation"
      />
    </NavbarLink>
    <NavbarLink
      v-if="canAccessUnassignedContent"
      :title="learnString('recommendedLabel')"
      :link="recommendedLink"
    >
      <mat-svg
        name="forum"
        category="communication"
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
