<template>

  <div class="AuthorizationMsg">
    <h1>
      {{ header || $tr('loginPrompt') }}
    </h1>
    <p>
      {{ details || defaultDetails }}
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
      header: { type: String },
      details: { type: String },
    },
    computed: {
      defaultDetails() {
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

  .AuthorizationMsg
    text-align: center

</style>
