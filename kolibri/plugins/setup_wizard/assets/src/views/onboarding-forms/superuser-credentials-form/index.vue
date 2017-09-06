<template>

  <onboarding-form header="Set user credentials" :submit-text="submitText" @submit="setSuperuserCredentials">
      <k-textbox v-model="name" label="Full name"/>
      <k-textbox v-model="username" label="Username"/>
      <k-textbox v-model="password" label="Password"/>
      <k-textbox v-model="passwordConfirm" label="Confirm Password"/>
  </onboarding-form>

</template>


<script>

  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import { submitSuperuserCredentials } from '../../../state/actions/forms';
  import onboardingForm from '../onboarding-form';

  // TODO wrap all strings in labels and header

  export default {
    name: 'superuserCredentialsForm',
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
