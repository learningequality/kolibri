<template>

  <subpage-container>
    <auth-message v-if="!isSuperuser" authorizedRole="superuser" />
    <template v-else>
      <div class="description">
        <h1>{{ $tr('header') }}</h1>
        <p>{{ $tr('deviceInfoDescription') }}</p>
      </div>
      {{ pageState }}
    </template>
  </subpage-container>

</template>


<script>

  import authMessage from 'kolibri.coreVue.components.authMessage';
  import { isSuperuser } from 'kolibri.coreVue.vuex.getters';
  import subpageContainer from '../containers/subpage-container';

  export default {
    name: 'deviceInfoPage',
    components: {
      authMessage,
      subpageContainer,
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
        isSuperuser,
      },
    },
    $trs: {
      header: 'Device Info',
      version: 'Kolibri version',
      url: 'Server URL',
      database: 'Database path',
      device: 'Device ID',
      os: 'Operating system',
      freedisk: 'Free disk space',
      time: 'Server time',
      timezone: 'Server timezone',
    },
  };

</script>


<style lang="stylus" scoped></style>
