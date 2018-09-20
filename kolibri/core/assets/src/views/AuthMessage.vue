<template>

  <div class="auth-message">
    <h1>
      {{ header }}
    </h1>
    <p>
      <slot name="details">
        {{ details || defaultDetails }}
      </slot>
    </p>
  </div>

</template>


<script>

  const userRoles = ['admin', 'adminOrCoach', 'learner', 'registeredUser', 'superuser'];

  export default {
    name: 'AuthMessage',
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
      admin: 'You must be signed in as an admin to view this page',
      adminOrCoach: 'You must be signed in as an admin or coach to view this page',
      learner: 'You must be signed in as a learner to view this page',
      registeredUser: 'You must be signed in to view this page',
      superuser: 'You must have super admin permissions to view this page',
      forgetToSignIn: 'Did you forget to sign in?',
    },
  };

</script>


<style lang="scss" scoped>

  .auth-message {
    text-align: center;
  }

</style>
