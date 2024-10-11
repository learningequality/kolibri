<template>

  <AuthBase :hideCreateAccount="true">
    <div class="auth-select">
      <div>
        <div class="label">
          {{ userString('signInPrompt') }}
        </div>
        <KRouterLink
          :text="coreString('signInLabel')"
          :to="signInRoute"
          appearance="raised-button"
          style="width: 100%"
          :primary="true"
        />
      </div>
      <div class="sign-up-prompt">
        <div class="label">
          {{ $tr('newUserPrompt') }}
        </div>
        <KRouterLink
          :text="userString('createAccountAction')"
          :to="signUpRoute"
          :primary="false"
          style="width: 100%"
          appearance="raised-button"
        />
      </div>
    </div>
  </AuthBase>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { ComponentMap } from '../constants';
  import AuthBase from './AuthBase';
  import commonUserStrings from './commonUserStrings';

  export default {
    name: 'AuthSelect',
    components: { AuthBase },
    mixins: [commonCoreStrings, commonUserStrings],
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
    $trs: {
      newUserPrompt: {
        message: 'Are you a new user?',
        context:
          'When a device has multiple facilities, the user is asked if they are a new user in association with a button that allows the user to create a new account',
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
