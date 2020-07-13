<template>

  <AuthBase :hideCreateAccount="true">
    <div class="auth-select">
      <div>
        <div class="label">
          {{ $tr("signInPrompt") }}
        </div>
        <KRouterLink
          :text="coreString('signInLabel')"
          :to="facilitySelectPage(PageNames.SIGN_IN)"
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
          :to="facilitySelectPage(PageNames.SIGN_UP)"
          :primary="false"
          style="width: 100%;"
          appearance="raised-button"
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
    font-size: 14px;
    text-align: left;

    .label {
      margin: 24px 0 16px;
    }
  }

</style>
