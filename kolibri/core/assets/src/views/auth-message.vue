<template>

  <div class="LoginMessage">
    <h1 id="login-prompt">
      {{ loginPrompt }}
    </h1>
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
        validator(role) {
          return role === 'admin' || role === 'learner';
        },
      },
      prompt: { type: String },
      command: { type: String },
    },
    computed: {
      loginPrompt() {
        return this.prompt || this.$tr('loginPrompt');
      },
      loginCommand() {
        if (this.command) {
          return this.command;
        }
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

</style>
