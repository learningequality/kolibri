<template>

  <div class="auth-message">
    <h1>
      {{ header || $tr('loginPrompt') }}
    </h1>
    <p>
      {{ details || defaultDetails }}
    </p>
  </div>

</template>


<script>

  const userRoles = [
    'admin',
    'admin_or_coach',
    'learner',
  ];

  module.exports = {
    props: {
      authorizedRole: {
        type: String,
        validator(role) {
          return userRoles.includes(role);
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
      admin_or_coach: 'an Admin or Coach',
      learner: 'a Learner',
      commandStart: 'You must be signed in as',
      commandEnd: 'to view this page.'
    },
  };

</script>


<style lang="stylus" scoped>

  .auth-message
    text-align: center

</style>
