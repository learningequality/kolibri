<template>

  <div class="LoginMessage">
    <h1>{{ $tr('loginPrompt') }}</h1>
    <p id="login-command">
      {{ loginCommand }}
    </p>
  </div>

</template>


<script>

  module.exports = {
    props: {
      // 'role' or 'learner'
      authorizedRole: {
        type: String,
        required: true,
        validator(role) {
          return role === 'admin' || role === 'learner';
        },
      },
    },
    computed: {
      loginCommand() {
        return `${this.$tr('commandStart')} ${this.$tr(this.authorizedRole)} ${this.$tr('commandEnd')}`;
      }
    },
    $trNameSpace: 'authMessage',
    $trs: {
      loginPrompt: 'Did you forget to sign in?',
      admin: 'an Admin',
      learner: 'a Learner',
      commandStart: 'You must be signed in as',
      commandEnd: 'to view this page.'
    },
  };

</script>


<style lang="stylus" scoped>

  .LoginMessage
    text-align: center
    margin-top: 200px

</style>
