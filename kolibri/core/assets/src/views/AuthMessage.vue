<template>

  <div class="auth-message">
    <h1>
      {{ header }}
    </h1>
    <p>
      <slot name="details">
        {{ detailsText }}
      </slot>
    </p>
    <p v-if="!isUserLoggedIn">
      <KExternalLink
        :text="linkText"
        :href="signInLink"
        appearance="basic-link"
      />
    </p>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import urls from 'kolibri.urls';

  const userRoles = [
    'admin',
    'adminOrCoach',
    'learner',
    'registeredUser',
    'superuser',
    'contentManager',
  ];

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
      ...mapGetters(['isUserLoggedIn']),
      detailsText() {
        return this.details || this.$tr(this.authorizedRole);
      },
      linkText() {
        if (!this.userPluginUrl) {
          return this.$tr('goBackToHomeAction');
        } else {
          return this.$tr('signInToKolibriAction');
        }
      },
      userPluginUrl() {
        return urls['kolibri:kolibri.plugins.user:user'];
      },
      signInLink() {
        // Creates a link to the Sign In Page that also has a query parameter that
        // will redirect back to this page after user logs in with correct credentials.
        if (!this.userPluginUrl) {
          // If User plugin is not active, go to the root of whatever plugin you're in.
          // In practice, this will only happen on select Learn pages.
          return '/';
        } else {
          const currentURL = window.encodeURIComponent(window.location.href);
          return `${this.userPluginUrl()}#signin?redirect=${currentURL}`;
        }
      },
    },
    $trs: {
      admin: 'You must be signed in as an admin to view this page',
      adminOrCoach: 'You must be signed in as an admin or coach to view this page',
      learner: 'You must be signed in as a learner to view this page',
      registeredUser: 'You must be signed in to view this page',
      superuser: {
        message: 'You must have super admin permissions to view this page',
        context:
          '\nMessage presented to any user *without* super admin permissions who accidentally lands on a Kolibri page that is reserved for super admins. ',
      },
      forgetToSignIn: 'Did you forget to sign in?',
      signInToKolibriAction: 'Sign in to Kolibri',
      goBackToHomeAction: 'Go to home page',
      contentManager:
        'You must be signed in as a superuser or have resource management permissions to view this page',
    },
  };

</script>


<style lang="scss" scoped>

  .auth-message {
    text-align: center;
  }

</style>
