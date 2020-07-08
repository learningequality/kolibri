<template>

  <AuthBase :hideCreateAccount="true">
    <div class="auth-select">
      <div class="sign-up-prompt" style="margin-bottom: 24px;">
        <div>{{ $tr("newUserPrompt") }}</div>
        <KRouterLink
          :text="$tr('createAccountAction')"
          :to="facilitySelectPage(PageNames.SIGN_UP)"
          appearance="flat-button"
          class="auth-button"
          data-test="createUser"
        />
      </div>
      <div>
        <div>{{ $tr("signInPrompt") }}</div>
        <KRouterLink
          :text="coreString('signInLabel')"
          :to="facilitySelectPage(PageNames.SIGN_IN)"
          appearance="flat-button"
          class="auth-button"
          data-test="signIn"
        />
      </div>
    </div>
  </AuthBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../constants';
  import AuthBase from './AuthBase';

  export default {
    name: 'AuthSelect',
    components: { AuthBase },
    mixins: [commonCoreStrings],
    computed: {
      PageNames() {
        return PageNames;
      },
    },
    methods: {
      facilitySelectPage(next) {
        return { name: PageNames.FACILITY_SELECT, query: { next, backTo: PageNames.AUTH_SELECT } };
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
    padding-top: 16px;
    text-align: left;
  }

  .sign-up-prompt {
    margin-bottom: 24px;
  }

  .auth-button {
    margin-left: -16px;
  }

</style>
