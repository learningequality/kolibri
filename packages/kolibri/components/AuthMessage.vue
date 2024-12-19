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
        data-test="signinlink"
      />
    </p>
    <p v-else>
      <KExternalLink
        :text="$tr('goBackToHomeAction')"
        :href="rootUrl"
        appearance="basic-link"
        data-test="gohomelink"
      />
    </p>
  </div>

</template>


<script>

  import urls from 'kolibri/urls';
  import useUser from 'kolibri/composables/useUser';

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
    setup() {
      const { isUserLoggedIn } = useUser();
      return { isUserLoggedIn };
    },
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
      details: {
        type: String,
        default: null,
      },
    },
    computed: {
      rootUrl() {
        return urls['kolibri:core:redirect_user']();
      },
      detailsText() {
        return this.details || this.$tr(this.authorizedRole);
      },
      linkText() {
        if (!this.userAuthPluginUrl) {
          return this.$tr('goBackToHomeAction');
        } else {
          return this.$tr('signInToKolibriAction');
        }
      },
      userAuthPluginUrl() {
        return urls['kolibri:kolibri.plugins.user_auth:user_auth'];
      },
      signInLink() {
        // Creates a link to the Sign In Page that also has a query parameter that
        // will redirect back to this page after user logs in with correct credentials.
        if (!this.userAuthPluginUrl) {
          // If User plugin is not active, go to the root of whatever plugin you're in.
          // In practice, this will only happen on select Learn pages.
          return '/';
        } else {
          let next;
          // If the current URL has a ?next param, use that instead of the current URL
          if (this.$route.query.next) {
            next = this.$route.query.next;
          } else {
            next = window.encodeURIComponent(window.location.href);
          }
          return `${this.userAuthPluginUrl()}#/signin?next=${next}`;
        }
      },
    },
    $trs: {
      admin: {
        message: 'You must be signed in as an admin to view this page',
        context:
          'Message presented to any user *without* admin permissions who accidentally lands on a Kolibri page that is reserved for admins.',
      },
      adminOrCoach: {
        message: 'You must be signed in as an admin or coach to view this page',
        context:
          'Message presented to any user *without* admin or coach permissions who accidentally lands on a Kolibri page that is reserved for admins or coaches.',
      },
      learner: {
        message: 'You must be signed in as a learner to view this page',
        context:
          'Message presented to any user who is *not* signed in as a learner when they attempt to view a page that is reserved for learners.',
      },
      registeredUser: {
        message: 'You must be signed in to view this page',
        context:
          'Message presented to any user who attempts to view a page that requires them to be signed in to Kolibri.',
      },
      superuser: {
        message: 'You must have super admin permissions to view this page',
        context:
          'Message presented to any user *without* super admin permissions who accidentally lands on a Kolibri page that is reserved for super admins. ',
      },
      forgetToSignIn: {
        message: 'Did you forget to sign in?',
        context: 'Prompt to remind users to sign in.',
      },
      signInToKolibriAction: {
        message: 'Sign in to Kolibri',
        context:
          'This text appears as a prompt to sign in to Kolibri if you already have an account and a username.\n\nIt may appear if your session has expired.',
      },
      goBackToHomeAction: {
        message: 'Go to home page',
        context:
          'Link that upon selecting takes the user back to the Kolibri home page where the user can sign in.',
      },
      contentManager: {
        message:
          'You must be signed in as a super admin or have resource management permissions to view this page',
        context:
          'Message presented to any user *without* super admin or resource management permissions who accidentally lands on a Kolibri page that is reserved for super admins.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .auth-message {
    text-align: center;
  }

</style>
