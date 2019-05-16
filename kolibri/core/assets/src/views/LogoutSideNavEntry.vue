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
    computed: {
      url() {
        return urls['kolibri:core:logout']();
      },
    },
    $trs: {
      signOut: 'Sign out',
    },
    role: UserKinds.LEARNER,
    priority: 100,
  };

</script>
