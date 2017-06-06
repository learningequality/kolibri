<template>

  <div class="auth-message">
    <h1>
      {{ header }}
    </h1>
    <p>
      {{ details || defaultDetails }}
    </p>
  </div>

</template>


<script>

  const userRoles = [
    'admin',
    'adminOrCoach',
    'deviceOwner',
    'learner',
    'registeredUser'
  ];

  module.exports = {
    props: {
      authorizedRole: {
        type: String,
        validator(role) {
          return userRoles.includes(role);
        },
        default: 'registeredUser',
      },
      header: {
        type: String,
        default() {
          return this.$tr('forgetToSignIn');
        },
      },
      details: { type: String },
    },
    computed: {
      defaultDetails() {
        return this.$tr('mustBeSignedInAsRole', { role: this.$tr(this.authorizedRole) });
      }
    },
    $trNameSpace: 'authMessage',
    $trs: {
      admin: 'an Admin',
      adminOrCoach: 'an Admin or Coach',
      deviceOwner: 'a Device Owner',
      forgetToSignIn: 'Did you forget to sign in?',
      learner: 'a Learner',
      mustBeSignedInAsRole: 'You must be signed in as {role} to view this page',
      registeredUser: 'a Registered User',
    },
  };

</script>


<style lang="stylus" scoped>

  .auth-message
    text-align: center

</style>
