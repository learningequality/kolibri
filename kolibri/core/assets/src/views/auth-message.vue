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

  const userRoles = ['admin', 'adminOrCoach', 'learner', 'registeredUser', 'superuser'];

  export default {
    name: 'authMessage',
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
        return this.$tr(this.authorizedRole);
      },
    },
    $trs: {
      admin: 'You must be signed in as an Admin to view this page',
      adminOrCoach: 'You must be signed in as an Admin or Coach to view this page',
      learner: 'You must be signed in as a Learner to view this page',
      registeredUser: 'You must be signed in to view this page',
      superuser: 'You must have Superuser permissions to view this page',
      forgetToSignIn: 'Did you forget to sign in?',
    },
  };

</script>


<style lang="stylus" scoped>

  .auth-message
    text-align: center

</style>
