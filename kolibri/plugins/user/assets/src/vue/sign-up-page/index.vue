<template>

  <div>
    <h1>Create an Account</h1>

    <form ref="form">
      <label>Name <input type="text" placeholder="Enter Name" required v-model="name"></label>
      <label>Username <input type="text" placeholder="Enter A Username" required v-model="username"></label>
      <label>Password <input type="password" placeholder="Enter A Password" required v-model="password"></label>
      <label>Confirm Password <input type="password" placeholder="Confirm Password" required v-model="confirmed_password"></label>
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

  label
    display: block

</style>
