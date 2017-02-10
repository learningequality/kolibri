<template>

  <div>
    <img class="logo" alt="logo">
    <h1>Sign in to Instant Schools</h1>

    <form ref="form">
      <label for="username">Username</label>
      <input
        id="username"
        type="text"
        placeholder="Enter Username"
        v-model="username"
        autocomplete="username"
        required
        autofocus>
      <label for="password">Password</label>
      <input
        id="password"
        type="password"
        placeholder="Enter Password"
        v-model="password"
        autocomplete="current-password"
        required>
      <icon-button text="Sign In" :primary="true" @click="signIn" type="submit"></icon-button>
    </form>

    <hr>

    <p>Don't have an account?</p>
    <router-link :to="signUp">
      <icon-button text="Create Account" :primary="true"></icon-button>
    </router-link>

    <router-link :to="learn">
      <icon-button text="Access as Guest" :primary="false"></icon-button>
    </router-link>
  </div>

</template>


<script>

  module.exports = {
    data: () => ({
      username: '',
      password: '',
    }),
    computed: {
      signUp() {
        return '/signup';
      },
      learn() {
        return '/learn';
      },
    },
    methods: {
      signIn() {
        if (this.$refs.form.checkValidity()) {
          // call sign in action
          console.log('sign in');
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
