<template>

  <div>
    <template v-if="canManageContent">
      <h1>{{ $tr('header') }}</h1>
      <table>
        <tr>
          <th>{{ $tr('kolibriVersion') }}</th>
          <td>{{ deviceInfo.version }}</td>
        </tr>
        <tr>
          <th>
            {{ $tr('url', { count: deviceInfo.urls.length }) }}
          </th>
          <td>
            <a
              v-for="(url, index) in deviceInfo.urls"
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
          <td>{{ deviceInfo.database_path }}</td>
        </tr>
        <tr>
          <th>{{ $tr('deviceName') }}</th>
          <td>{{ deviceInfo.device_name }}</td>
        </tr>
        <tr>
          <th>{{ $tr('os') }}</th>
          <td>{{ deviceInfo.os }}</td>
        </tr>
        <tr>
          <th>{{ $tr('freeDisk') }}</th>
          <td>{{ deviceInfo.content_storage_free_space }}</td>
        </tr>
        <tr>
          <th>{{ $tr('serverTime') }}</th>
          <td>{{ $tr('formattedTime', { datetime: deviceInfo.server_time }) }}</td>
        </tr>
        <tr>
          <th>{{ $tr('serverTimezone') }}</th>
          <td>{{ deviceInfo.server_timezone }}</td>
        </tr>
        <tr>
          <th>{{ $tr('serverType') }}</th>
          <td>{{ deviceInfo.server_type }}</td>
        </tr>
        <tr>
          <th>{{ $tr('serverInstallation') }}</th>
          <td>{{ deviceInfo.installer }}</td>
        </tr>
      </table>
    </template>

    <!-- TODO: Update to: Anyone who can manage content -->
    <AuthMessage v-else authorizedRole="admin" />
  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';

  export default {
    name: 'DeviceInfoPage',
    metaInfo() {
      return {
        title: this.$tr('header'),
      };
    },
    components: {
      AuthMessage,
    },
    computed: {
      ...mapGetters(['canManageContent']),
      ...mapState('deviceInfo', ['deviceInfo']),
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
      serverType: 'Server type',
      serverInstallation: 'Server installer',
    },
  };

</script>


<style lang="scss" scoped>

  table {
    margin-top: 16px;
  }

  th {
    padding-right: 24px;
    padding-bottom: 24px;
    text-align: left;
    vertical-align: top;
  }

  td {
    padding-bottom: 24px;
  }

  .link {
    display: block;
  }

  .link:not(:last-child) {
    margin-bottom: 8px;
  }

</style>
