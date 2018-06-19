<template>

  <core-menu-option
    :label="$tr('signIn')"
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
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';

  const component = {
    name: 'loginSideNavEntry',
    components: {
      coreMenuOption,
    },
    $trs: {
      signIn: 'Sign in',
    },
    computed: {
      url() {
        return urls['kolibri:user:user']();
      },
    },
    role: UserKinds.ANONYMOUS,
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>


<style lang="stylus" scoped></style>
