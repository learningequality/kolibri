<template>

  <div>
    <h1>{{ $tr('header') }}</h1>
    <table>
      <tr>
        <th>
          {{ $tr('url', { count: deviceInfo.urls.length }) }}
        </th>
        <td>
          <KExternalLink
            v-for="(url, index) in deviceInfo.urls"
            :key="index"
            :text="url"
            :href="url"
            :primary="true"
            target="_blank"
            appearance="basic-link"
          />
        </td>
      </tr>
      <tr>
        <th>{{ $tr('freeDisk') }}</th>
        <td>{{ deviceInfo.content_storage_free_space }}</td>
      </tr>
      <tr>
        <th>{{ $tr('kolibriVersion') }}</th>
        <td>{{ deviceInfo.version }}</td>
      </tr>
    </table>

    <h1>{{ $tr('advanced') }}</h1>
    <p>{{ $tr('advancedDescription') }}</p>
    <div>
      <KButton
        :text="buttonText"
        appearance="basic-link"
        @click="advancedShown = !advancedShown"
      />
    </div>
    <TechnicalTextBlock
      v-if="advancedShown"
      dir="auto"
      :text="infoText"
      class="bottom-section"
    />
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import TechnicalTextBlock from 'kolibri.coreVue.components.TechnicalTextBlock';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'DeviceInfoPage',
    metaInfo() {
      return {
        title: this.$tr('header'),
      };
    },
    components: {
      TechnicalTextBlock,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        advancedShown: false,
      };
    },
    computed: {
      ...mapState('deviceInfo', ['deviceInfo']),
      buttonText() {
        return this.advancedShown ? this.$tr('hide') : this.coreString('showAction');
      },
      infoText() {
        return [
          `Version:           ${this.deviceInfo.version}`,
          `OS:                ${this.deviceInfo.os}`,
          `Python:            ${this.deviceInfo.python_version}`,
          `Installer:         ${this.deviceInfo.installer}`,
          `Server:            ${this.deviceInfo.server_type}`,
          `Database:          ${this.deviceInfo.database_path}`,
          `Device name:       ${this.deviceInfo.device_name}`,
          `Free disk space:   ${this.deviceInfo.content_storage_free_space}`,
          `Server time:       ${this.deviceInfo.server_time}`,
          `Server timezone:   ${this.deviceInfo.server_timezone}`,
        ].join('\n');
      },
    },
    $trs: {
      header: 'Device info',
      kolibriVersion: 'Kolibri version',
      url: 'Server {count, plural, one {URL} other {URLs}}',
      freeDisk: 'Free disk space',
      advanced: 'Advanced',
      advancedDescription: 'This information may be helpful for troubleshooting or error reporting',
      hide: 'Hide',
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

  .bottom-section {
    margin-top: 16px;
  }

</style>
