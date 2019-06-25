<template>

  <KNavbar>
    <KNavbarLink
      v-if="isUserLoggedIn && userHasMemberships"
      name="classes-link"
      :title="coreCommon$tr('classesLabel')"
      :link="allClassesLink"
    >
      <mat-svg
        name="business"
        category="communication"
      />
    </KNavbarLink>
    <KNavbarLink
      :title="coreCommon$tr('channelsLabel')"
      :link="channelsLink"
    >
      <mat-svg
        name="apps"
        category="navigation"
      />
    </KNavbarLink>
    <KNavbarLink
      :title="learnCommon$tr('recommendedLabel')"
      :link="recommendedLink"
    >
      <mat-svg
        name="forum"
        category="communication"
      />
    </KNavbarLink>
  </KNavbar>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import KNavbar from 'kolibri.coreVue.components.KNavbar';
  import KNavbarLink from 'kolibri.coreVue.components.KNavbarLink';
  import { coreStringsMixin } from 'kolibri.coreVue.mixins.coreStringsMixin';
  import { ClassesPageNames, PageNames } from '../constants';
  import { learnStringsMixin } from './commonLearnStrings';

  export default {
    name: 'LearnTopNav',
    components: {
      KNavbar,
      KNavbarLink,
    },
    mixins: [coreStringsMixin, learnStringsMixin],
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
      ...mapGetters(['isUserLoggedIn']),
      ...mapState({
        userHasMemberships: state => state.memberships.length > 0,
      }),
    },
    methods: {},
  };

</script>


<style lang="scss" scoped></style>
