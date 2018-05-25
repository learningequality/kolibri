<template>

  <div>
    <subpage-container v-if="canManageContent">
      <h1>{{ $tr('header') }}</h1>
      <table>
        <tr>
          <th>{{ $tr('kolibriVersion') }}</th>
          <td>{{ info.version }}</td>
        </tr>
        <tr>
          <th>
            {{ $tr('url', { count: info.urls.length }) }}
          </th>
          <td>
            <a
              v-for="(url, index) in info.urls"
              :key="index"
              :href="url"
              target="_blank"
              class="link"
            >
              {{ url }}
            </a>
          </td>
        </tr>
        <tr>
          <th>{{ $tr('database') }}</th>
          <td>{{ info.database_path }}</td>
        </tr>
        <tr>
          <th>{{ $tr('deviceName') }}</th>
          <td>{{ info.device_name }}</td>
        </tr>
        <tr>
          <th>{{ $tr('os') }}</th>
          <td>{{ info.os }}</td>
        </tr>
        <tr>
          <th>{{ $tr('freeDisk') }}</th>
          <td>{{ info.content_storage_free_space }}</td>
        </tr>
        <tr>
          <th>{{ $tr('serverTime') }}</th>
          <td>{{ $tr('formattedTime', { datetime: info.server_time }) }}</td>
        </tr>
        <tr>
          <th>{{ $tr('serverTimezone') }}</th>
          <td>{{ info.server_timezone }}</td>
        </tr>

      </table>
    </subpage-container>

    <!-- TODO: Update to: Anyone who can manage content -->
    <auth-message v-else authorizedRole="admin" />
  </div>

</template>


<script>

  import authMessage from 'kolibri.coreVue.components.authMessage';
  import { canManageContent } from 'kolibri.coreVue.vuex.getters';
  import subpageContainer from './containers/subpage-container';

  export default {
    name: 'deviceInfoPage',
    components: {
      authMessage,
      subpageContainer,
    },
    vuex: {
      getters: {
        info: state => state.pageState.deviceInfo,
        canManageContent,
      },
    },
    $trs: {
      header: 'Device info',
      kolibriVersion: 'Kolibri version',
      url: 'Server {count, plural, one {URL} other {URLs}}',
      database: 'Database path',
      deviceName: 'Device name',
      os: 'Operating system',
      freeDisk: 'Free disk space',
      serverTime: 'Server time',
      formattedTime: '{datetime, time, long} on {datetime, date, long}',
      serverTimezone: 'Server timezone',
    },
  };

</script>


<style lang="stylus" scoped>

  table
    margin-top: 16px
    width: 100%

  th
    text-align: left
    vertical-align: top
    padding-bottom: 24px
    padding-right: 24px

  td
    padding-bottom: 24px

  .link
    display: block

  .link:not(:last-child)
    margin-bottom: 8px

</style>
