<template>

  <div>
    <h1>{{ $tr('createAccount') }}</h1>

    <form ref="form" @submit.prevent="signUp">
      <label for="name">{{ $tr('name') }}</label>
      <input
        id="name"
        type="text"
        :placeholder="$tr('enterName')"
        :aria-label="$tr('name')"
        v-model="name"
        autocomplete="name"
        required
        autofocus>
      <label for="username">{{ $tr('username') }}</label>
      <input
        id="username"
        type="text"
        :placeholder="$tr('enterUsername')"
        :aria-label="$tr('username')"
        v-model="username"
        required>
      <label for="password">{{ $tr('password') }}</label>
      <input
        id="password"
        type="password"
        :placeholder="$tr('enterPassword')"
        :aria-label="$tr('password')"
        v-model="password"
        autocomplete="new-password"
        required>
      <label for="confirmed-password">{{ $tr('confirmPassword') }}</label>
      <input
        id="confirmed-password"
        type="password"
        :placeholder="$tr('confirmPassword')"
        :aria-label="$tr('confirmPassword')"
        v-model="confirmed_password"
        required>
      <icon-button :primary="true" text="Finish" type="submit"></icon-button>
    </form>

  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'signUpPage',
    $trs: {
      createAccount: 'Create an Account',
      name: 'Name',
      enterName: 'Enter Name',
      username: 'Username',
      enterUsername: 'Enter Username',
      password: 'Password',
      enterPassword: 'Enter Password',
      confirmPassword: 'Confirm Password',
    },
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
