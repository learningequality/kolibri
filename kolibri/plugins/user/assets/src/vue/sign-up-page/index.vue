<template>

  <div>
    <h1>Create an Account</h1>

    <form ref="form">
      <label for="name">Name</label>
      <input
        id="name"
        type="text"
        placeholder="Enter Name"
        v-model="name"
        autocomplete="name"
        required
        autofocus>
      <label for="username">Username</label>
      <input
        id="username"
        type="text"
        placeholder="Enter A Username"
        v-model="username"
        required>
      <label for="password">Password</label>
      <input
        id="password"
        type="password"
        placeholder="Enter A Password"
        v-model="password"
        autocomplete="new-password"
        required>
      <label for="confirmed-password">Confirm Password</label>
      <input
        id="confirmed-password"
        type="password"
        placeholder="Confirm Password"
        v-model="confirmed_password"
        required>
      <icon-button :primary="true" text="Finish" type="submit" @click="signUp"></icon-button>
    </form>

  </div>

</template>


<script>

  module.exports = {
    data: () => ({
      name: '',
      username: '',
      password: '',
      confirmed_password: '',
    }),
    methods: {
      signUp() {
        if (this.$refs.form.checkValidity()) {
          // call sign up action
          console.log('sign up');
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  input
    display: block

</style>
