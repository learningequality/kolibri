<template>

  <CoreMenuOption
    :label="$tr('profile')"
    :link="url"
    v-if="show"
  >
    <mat-svg
      slot="icon"
      name="account_circle"
      category="action"
    />
  </CoreMenuOption>

</template>


<script>

  import { mapState } from 'vuex';
  import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import { PageNames } from '../constants';

  const component = {
    name: 'UserProfileSideNavEntry',
    components: {
      CoreMenuOption,
    },
    $trs: {
      profile: 'Profile',
    },
    computed: {
      ...mapState(['pageName']),
      url() {
        return urls['kolibri:user:user']();
      },
      show() {
        return this.pageName !== PageNames.PROFILE;
      },
    },
    role: UserKinds.LEARNER,
    priority: 10,
    section: NavComponentSections.ACCOUNT,
  };

  navComponents.register(component);

  export default component;

</script>


<style lang="scss" scoped></style>
