<template>

  <h1 v-if="bannerClosed">
    {{ $tr('demoServerHeader') }}
  </h1>
  <div v-else>
    <h1>{{ $tr('demoServerHeader') }}</h1>
    <p>{{ $tr('demoServerP1') }}</p>
    <ul>
      <li>{{ $tr('demoServerL1', { user: 'learnerdemo', pass: 'pass' }) }}</li>
      <li>{{ $tr('demoServerL2', { user: 'coachdemo', pass: 'pass' }) }}</li>
    </ul>
    <p>{{ $tr('demoServerP2') }}</p>
    <p>{{ $tr('demoServerP3') }}</p>
    <ul>
      <li>
        <KExternalLink
          href="https://learningequality.org/documentation/"
          :text="$tr('demoServerA1')"
          :openInNewTab="true"
        />
      </li>
      <li>
        <KExternalLink
          href="https://learningequality.org/download/"
          :text="$tr('demoServerA2')"
          :openInNewTab="true"
        />
      </li>
    </ul>
  </div>

</template>


<script>

  export default {
    name: 'DemoServerBannerContent',
    props: {
      bannerClosed: {
        required: true,
        type: Boolean,
        default: false,
      },
    },
    $trs: {
      demoServerHeader: {
        message: 'Welcome to the Kolibri demo site',
        context: 'Title on Kolibri demo site sign in page.',
      },
      demoServerP1: {
        message: 'Explore any of these user types:',
        context: 'Description text on demo sign in page.',
      },
      demoServerL1: {
        message: 'Learner ({user}/{pass} or explore without an account)',
        context:
          "Provides a username and password for a user to sign in to the demo facility as a Learner. Also indicates that there's an option to sign in as a guest without the need for a username or password.",
      },
      demoServerL2: {
        message: 'Coach ({user}/{pass})',
        context:
          'Provides a username and password for a user to sign in to the demo facility as a Coach.',
      },
      demoServerP2: {
        message:
          'This online version of Kolibri is intended for demonstration purposes only. Users and data will be periodically deleted. The demo shows features of the latest Kolibri version, and all resources found are samples.',
        context: 'Descriptive text on Kolibri demo sign in page.',
      },
      demoServerP3: {
        message:
          'To learn more about using Kolibri in an offline context and better understand the platform:',
        context: 'Descriptive text on Kolibri demo sign in page.',
      },
      demoServerA1: {
        message: 'Read the documentation',
        context: 'Link from sign in page which takes user to the Kolibri documentation website.',
      },
      demoServerA2: {
        message: 'Download and install the latest release',
        context:
          'Link on sign in page which takes user to a web page where they can download the latest version of Kolibri.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
