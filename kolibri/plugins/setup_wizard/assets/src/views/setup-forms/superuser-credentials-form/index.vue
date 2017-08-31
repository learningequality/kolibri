<template>

  <form @submit="setSuperuserCredentials">
    <fieldset>
      <legend>
        <h1>
          Set user credentials
        </h1>
      </legend>

      <k-textbox v-model="name" label="Full name"/>
      <k-textbox v-model="username" label="Username"/>
      <k-textbox v-model="password" label="Password"/>
      <k-textbox v-model="passwordConfirm" label="Confirm Password"/>

      <k-button type="submit" :text="submitText" />

    </fieldset>
  </form>

</template>


<script>

  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { submitSuperuserCredentials } from '../../../state/actions/forms';

  export default {
    name: 'superuserCredentialsForm',
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    components: {
      kTextbox,
      kButton,
    },
    data() {
      return {
        name: '',
        username: '',
        password: '',
        passwordConfirm: '',
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
    },
  };

</script>


<style lang="stylus" scoped></style>
