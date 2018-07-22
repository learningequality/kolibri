<template>

  <div>
    <template v-if="canManageContent">
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
      ...mapState({
        info: state => state.pageState.deviceInfo,
      }),
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
