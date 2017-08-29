<template>

  <form>
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

  export default {
    name: 'superUserCredentialsForm',
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
  };

</script>


<style lang="stylus" scoped></style>
