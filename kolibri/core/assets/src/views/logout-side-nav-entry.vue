<template>

  <core-menu-option
    :label="$tr('signOut')"
    :link="url"
  >
    <mat-svg
      slot="icon"
      name="exit_to_app"
      category="action"
      :class="{ 'rtl-icon': isRtl }"
    />
  </core-menu-option>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import coreMenuOption from 'kolibri.coreVue.components.coreMenuOption';
  import urls from 'kolibri.urls';

  export default {
    name: 'logoutSideNavEntry',
    components: {
      coreMenuOption,
    },
    $trs: {
      signOut: 'Sign out',
    },
    computed: {
      url() {
        return urls['kolibri:logout']();
      },
    },
    role: UserKinds.LEARNER,
    priority: 100,
  };

</script>


<style lang="stylus" scoped></style>
