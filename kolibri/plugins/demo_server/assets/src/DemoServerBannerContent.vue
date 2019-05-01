<template>

  <div>
    <h1>{{ $tr('demoServerHeader') }}</h1>
    <p>{{ $tr('demoServerP1') }}</p>
    <ul>
      <li>{{ $tr('demoServerL1', {user: 'learnerdemo', pass: 'pass'} ) }}</li>
      <li>{{ $tr('demoServerL2', {user: 'coachdemo', pass: 'pass'} ) }}</li>
      <li>{{ $tr('demoServerL3', {user: 'admindemo', pass: 'pass'} ) }}</li>
    </ul>
    <p>{{ $tr('demoServerP2') }}</p>
    <p>{{ $tr('demoServerP3') }}</p>
    <ul>
      <li>
        <KExternalLink
          href="https://learningequality.org/documentation/"
          :text="$tr('demoServerA1')"
          target="_blank"
        />
      </li>
      <li>
        <KExternalLink
          href="https://learningequality.org/download/"
          :text="$tr('demoServerA2')"
          target="_blank"
        />
      </li>
    </ul>
    <KButton
      class="close-button"
      :text="'Close'"
      appearance="flat-button"
      :primary="true"
      @click="$root.$emit('toggleBannerState')"
    />
  </div>

</template>


<script>

  import KExternalLink from 'kolibri.coreVue.components.KExternalLink';
  import KButton from 'kolibri.coreVue.components.KButton';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    name: 'DemoServerBannerContent',
    components: { KExternalLink, KButton },
    mixins: [themeMixin],
    $trs: {
      demoServerHeader: 'Welcome to the Kolibri demo site!',
      demoServerP1: 'Explore any of the three primary user types:',
      demoServerL1: 'Learner ({user}/{pass} or access as a guest)',
      demoServerL2: 'Coach ({user}/{pass})',
      demoServerL3: 'Admin ({user}/{pass})',
      demoServerP2:
        'This online demo is intended for demonstration purposes and any user may be periodically cleared. This demo has features of the latest Kolibri version and all resources found are samples.',
      demoServerP3:
        'To learn more about using Kolibri in an offline context and better understand the platform:',
      demoServerA1: 'Read the documentation',
      demoServerA2: 'Download and install the latest release',
    },
  };

</script>


<style lang="scss" scoped>

  .close-button {
    float: right;
    margin-bottom: 24px;
  }

</style>
