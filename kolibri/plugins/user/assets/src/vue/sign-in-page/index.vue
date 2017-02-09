<template>

  <div>
    <img class="logo" alt="logo">
    <h1>Sign in to Instant Schools</h1>

    <form ref="form">
      <label>Username<input type="text" placeholder="Enter Username" required v-model="username"></label>
      <label>Password <input type="password" placeholder="Enter Password" required v-model="password"></label>
      <icon-button :primary="true" text="Sign In" type="submit" @click="signIn"></icon-button>
    </form>

    <hr>

    <p>Don't have an account?</p>
    <router-link :to="signUp">
      <icon-button :primary="true" text="Create Account"></icon-button>
    </router-link>

    <router-link :to="learn">
      <icon-button :primary="false" text="Access as Guest"></icon-button>
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

  label
    display: block

  form
    display: inline

</style>
