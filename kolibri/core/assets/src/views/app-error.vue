<template>

  <div class="app-error">

    <!-- kolibri image? -->
    <logo class="logo" />
    <!-- Header message -->
    <h1>
      {{ $tr('defaultErrorHeader') }}
    </h1>

    <p>
      {{ $tr('defaultErrorMessage') }}
    </p>

    <p>
      {{ $tr('defaultErrorResolution') }}
    </p>

    <div>
      <!-- button link to go back to "home"? -->
      <k-router-link
        appearance="raised-button"
        :to="{route: '/'}"
        :primary="true"
        :text="$tr('defaultErrorExitPrompt')"
      />
    </div>

    <div>
      <!-- link button to open reporting modal -->
      <k-button
        appearance="basic-link"
        :text="$tr('defaultErrorReportPrompt')"
      />

    </div>

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kExternalLink from 'kolibri.coreVue.components.kExternalLink';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import logo from 'kolibri.coreVue.components.logo';

  export default {
    name: 'app-error',
    $trs: {
      defaultErrorHeader: 'Sorry! Something went wrong!',
      defaultErrorExitPrompt: 'Back to home',
      defaultErrorMessage:
        'We care about your experience on Kolibri and are working hard to fix this issue.',
      defaultErrorResolution: 'Try refreshing this page or going back to the home page.',
      defaultErrorReportPrompt: 'Help us by reporting this error',
    },
    components: {
      authMessage,
      kButton,
      kExternalLink,
      kRouterLink,
      logo,
    },
    data() {
      return {
        isHidden: false,
      };
    },
    computed: {
      ...mapState({
        error: state => state.core.error,
      }),
    },
    methods: {},
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .app-error {
    margin-top: 64px;
    text-align: center;
  }

  .logo {
    width: 160px;
    height: 160px;
  }

  .button {
    margin-right: auto;
    margin-left: auto;
  }

</style>
