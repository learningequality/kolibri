<template>

  <CoreMenuOption
    :label="$tr('signOut')"
    :link="url"
  >
    <mat-svg
      slot="icon"
      name="exit_to_app"
      category="action"
      :class="{ 'rtl-icon': isRtl }"
    />
  </CoreMenuOption>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import urls from 'kolibri.urls';

  export default {
    name: 'LogoutSideNavEntry',
    components: {
      CoreMenuOption,
    },
    $trs: {
      signOut: 'Sign out',
    },
    computed: {
      url() {
        return urls['kolibri:core:logout']();
      },
    },
    role: UserKinds.LEARNER,
    priority: 100,
  };

</script>
