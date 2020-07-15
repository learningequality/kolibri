<template>

  <CoreBase
    :immersivePage="false"
    :immersivePagePrimary="false"
    :fullScreen="true"
  >
    <AuthBase :hideCreateAccount="true">
      <div class="auth-select">
        <div>
          <div class="label">
            {{ $tr("signInPrompt") }}
          </div>
          <KRouterLink
            :text="coreString('signInLabel')"
            :to="signInRoute"
            appearance="raised-button"
            style="width: 100%;"
            :primary="true"
          />
        </div>
        <div class="sign-up-prompt">
          <div class="label">
            {{ $tr("newUserPrompt") }}
          </div>
          <KRouterLink
            :text="$tr('createAccountAction')"
            :to="signUpRoute"
            :primary="false"
            style="width: 100%;"
            appearance="raised-button"
          />
        </div>
      </div>
    </AuthBase>
  </CoreBase>

</template>


<script>

  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ComponentMap } from '../constants';
  import AuthBase from './AuthBase';

  export default {
    name: 'AuthSelect',
    components: { AuthBase, CoreBase },
    mixins: [commonCoreStrings],
    computed: {
      signUpRoute() {
        const whereToNext = this.$router.getRoute(ComponentMap.SIGN_UP);
        return { ...this.facilitySelectRoute, params: { whereToNext } };
      },
      signInRoute() {
        const whereToNext = this.$router.getRoute(ComponentMap.SIGN_IN);
        return { ...this.facilitySelectRoute, params: { whereToNext } };
      },
      facilitySelectRoute() {
        return this.$router.getRoute(ComponentMap.FACILITY_SELECT);
      },
    },
    methods: {
      route(whereToNext) {
        const route = this.facilitySelectRoute;
        route.params = { whereToNext };
        return route;
      },
    },
    $trs: {
      createAccountAction: 'Create an account',
      newUserPrompt: {
        message: 'Are you a new user?',
        context:
          'When a device has multiple facilities, the user is asked if they are a new user in association with a button that allows the user to create a new account',
      },
      signInPrompt: {
        message: 'Sign in if you have an existing account',
        context:
          'When a device has multiple facilities, this message is above a button which leads the user to the rest of the sign in process.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .auth-select {
    font-size: 14px;
    text-align: left;

    .label {
      margin: 24px 0 16px;
    }
  }

</style>
