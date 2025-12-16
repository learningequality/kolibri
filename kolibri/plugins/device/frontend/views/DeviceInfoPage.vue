<template>

  <DeviceAppBarPage :title="pageTitle">
    <KPageContainer
      v-if="!isPageLoading"
      class="device-container"
    >
      <div>
        <h1>{{ $tr('header') }}</h1>
        <table :class="windowIsSmall ? 'mobile-table' : ''">
          <tr>
            <th>
              {{ $tr('url', { count: deviceInfo.urls.length }) }}
            </th>
            <td :class="windowIsSmall ? 'mobile' : ''">
              <KExternalLink
                v-for="(url, index) in deviceInfo.urls"
                :key="index"
                :text="url"
                :href="url"
                :primary="true"
                :openInNewTab="true"
                appearance="basic-link"
              />
            </td>
          </tr>
          <tr>
            <th>{{ $tr('freeDisk') }}</th>
            <td>{{ deviceInfo.content_storage_free_space }}</td>
          </tr>
          <tr>
            <th>
              {{ $tr('kolibriVersion') }}
            </th>
            <td :class="windowIsSmall ? 'mobile' : ''">
              {{ deviceInfo.version }}
            </td>
          </tr>
          <tr>
            <th>{{ coreString('deviceNameLabel') }}</th>
            <td>
              {{ deviceNameWithId }}
              <KButton
                class="edit-button"
                :text="coreString('editAction')"
                appearance="basic-link"
                @click="showDeviceNameModal = true"
              />
            </td>
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
        <DeviceNameModal
          v-if="showDeviceNameModal"
          :deviceName="deviceName"
          @submit="handleSubmitDeviceName"
          @cancel="showDeviceNameModal = false"
        />
      </div>
    </KPageContainer>
  </DeviceAppBarPage>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import TechnicalTextBlock from 'kolibri/components/error/TechnicalTextBlock';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import DeviceAppBarPage from './DeviceAppBarPage';
  import { deviceString } from './commonDeviceStrings';
  import DeviceNameModal from './DeviceNameModal';

  export default {
    name: 'DeviceInfoPage',
    metaInfo() {
      return {
        title: this.$tr('header'),
      };
    },
    components: {
      DeviceAppBarPage,
      DeviceNameModal,
      TechnicalTextBlock,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      const { createSnackbar } = useSnackbar();
      return {
        windowIsSmall,
        createSnackbar,
      };
    },
    data() {
      return {
        advancedShown: false,
        showDeviceNameModal: false,
      };
    },
    computed: {
      ...mapGetters(['isPageLoading']),
      ...mapState('deviceInfo', ['deviceInfo', 'deviceName']),
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
          `Free disk space:   ${this.deviceInfo.content_storage_free_space}`,
          `Server time:       ${this.deviceInfo.server_time}`,
          `Server timezone:   ${this.deviceInfo.server_timezone}`,
          `Device ID:         ${this.deviceInfo.device_id}`,
        ].join('\n');
      },
      deviceNameWithId() {
        return this.$tr('deviceNameWithId', {
          deviceName: this.deviceName,
          deviceId: this.deviceInfo.device_id.slice(0, 4),
        });
      },
      pageTitle() {
        return deviceString('deviceManagementTitle');
      },
    },
    methods: {
      handleSubmitDeviceName(newName) {
        this.showDeviceNameModal = false;
        this.$store
          .dispatch('deviceInfo/updateDeviceName', newName)
          .then(() => {
            this.createSnackbar(this.coreString('changesSavedNotification'));
          })
          .catch(() => {
            this.createSnackbar(this.coreString('changesNotSavedNotification'));
          });
      },
    },
    $trs: {
      header: {
        message: 'Device info',
        context: 'Title of the Device > Info page.',
      },
      kolibriVersion: {
        message: 'Kolibri version',
        context: 'Indicates the version of Kolibri currently running on the device.',
      },
      url: {
        message: 'Server {count, plural, one {URL} other {URLs}}',
        context: 'Indicates the server URL. (In plural if there is more than one URL)',
      },
      freeDisk: {
        message: 'Free disk space',
        context:
          "In the 'Advanced' section this indicates how much disk space is free on the Device.",
      },
      advanced: {
        message: 'Advanced',
        context:
          'Option on the Device > Info tab which shows more detailed information about the device.',
      },
      advancedDescription: {
        message: 'This information may be helpful for troubleshooting or error reporting',
        context: "Description of the 'Advanced' section on the 'Device info' page.",
      },
      hide: {
        message: 'Hide',
        context:
          "Option to show or hide the 'Advanced' information section of the 'Device info' page.",
      },
      deviceNameWithId: {
        message: '{deviceName} ({deviceId})',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

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

  .edit-button {
    display: inline;
  }

  .mobile-table {
    table-layout: fixed;
  }

  .mobile {
    max-width: 1px;
    word-wrap: break-word;
  }

</style>
