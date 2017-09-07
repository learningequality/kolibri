<template>

  <onboarding-form
    :header="$tr('adminAccountCreationHeader')"
    :details="$tr('adminAccountCreationDetails')"
    :submit-text="submitText"
    @submit="setSuperuserCredentials">

      <k-textbox
        v-model="name"
        :label="$tr('adminNameFieldLabel')"
        :autofocus="true"
        autocomplete="name"
        :maxlength="120"
      />
      <k-textbox
        v-model="username"
        :label="$tr('adminUsernameFieldLabel')"
        type="username"
        autocomplete="username"
        :maxlength="30"
      />
      <k-textbox
        v-model="password"
        :label="$tr('adminPasswordFieldLabel')"
        type="password"
        autocomplete="new-password"
      />
      <k-textbox
        v-model="passwordConfirm"
        :label="$tr('adminPasswordConfirmationFieldLabel')"
        type="password"
        autocomplete="new-password"
      />

  </onboarding-form>

</template>


<script>

  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import { submitSuperuserCredentials } from '../../../state/actions/forms';
  import onboardingForm from '../onboarding-form';

  export default {
    name: 'superuserCredentialsForm',
    $trs: {
      adminAccountCreationHeader: 'Create your Admin account',
      adminAccountCreationDetails:
        'This account allows you to manage your Facility and content on this device.',
      adminNameFieldLabel: 'Full name',
      adminUsernameFieldLabel: 'Username',
      adminPasswordFieldLabel: 'Password',
      adminPasswordConfirmationFieldLabel: 'Enter password again',
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    components: {
      onboardingForm,
      kTextbox,
    },
    data() {
      return {
        name: this.currentName,
        username: this.currentUsername,
        password: this.currentPassword,
        passwordConfirm: this.currentPassword,
      };
    },
    methods: {
      setSuperuserCredentials() {
        this.submitSuperuserCredentials(this.name, this.username, this.password);
        this.$emit('submit');
      },
    },
    vuex: {
      actions: {
        submitSuperuserCredentials,
      },
      getters: {
        currentName: state => state.onboardingData.superuser.full_name,
        currentUsername: state => state.onboardingData.superuser.username,
        currentPassword: state => state.onboardingData.superuser.password,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
