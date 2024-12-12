<template>

  <KModal
    :title="$attrs.title || getCommonSyncString('selectNetworkAddressTitle')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    size="medium"
    :submitDisabled="formDisabled || submitDisabled"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <template>
      <!-- <p v-if="filterLODAvailable">
        {{ $tr('lodSubHeader') }}
      </p> -->
      <p v-if="hasFetched && !devices.length">
        {{ $tr('noDeviceText') }}
      </p>
      <UiAlert
        v-if="uiAlertProps"
        v-show="showUiAlerts"
        :type="uiAlertProps.type"
        :dismissible="false"
      >
        {{ uiAlertProps.text }}
        <KButton
          v-if="fetchFailed || deletingFailed"
          appearance="basic-link"
          :text="$tr('refreshDevicesButtonLabel')"
          @click="forceFetch"
        />
      </UiAlert>

      <!-- Static Devices -->
      <KRadioButtonGroup>
        <template v-for="(d, idx) in savedDevices">
          <div :key="`div-${idx}`">
            <KRadioButton
              :key="idx"
              v-model="selectedDeviceId"
              class="radio-button"
              :buttonValue="d.id"
              :label="d.nickname"
              :description="d.base_url"
              :disabled="formDisabled || !isDeviceAvailable(d.id)"
            />
            <KButton
              :key="`forget-${idx}`"
              :text="coreString('removeAction')"
              class="remove-device-button"
              appearance="basic-link"
              @click="removeSavedDevice(d.id)"
            />
          </div>
        </template>
      </KRadioButtonGroup>

      <hr
        v-if="savedDevices.length > 0 && discoveredDevices.length > 0"
        :style="{ border: 0, borderBottom: `1px solid ${$themeTokens.fineLine}` }"
      >

      <!-- Dynamic Devices -->
      <KRadioButtonGroup>
        <template v-for="d in discoveredDevices">
          <div :key="`div-${d.id}`">
            <KRadioButton
              :key="d.id"
              v-model="selectedDeviceId"
              class="radio-button"
              :buttonValue="d.instance_id"
              :label="formatNameAndId(d.device_name, d.id)"
              :description="formatBaseDevice(d)"
              :disabled="formDisabled || fetchFailed || !isDeviceAvailable(d.id)"
            />
          </div>
        </template>
      </KRadioButtonGroup>
    </template>

    <template #actions>
      <KFixedGrid
        class="actions"
        numCols="4"
      >
        <KFixedGridItem span="1">
          <transition name="spinner-fade">
            <div v-if="isFetching || isChecking">
              <KLabeledIcon>
                <template #icon>
                  <KCircularLoader
                    :size="16"
                    :stroke="6"
                    class="loader"
                  />
                </template>
              </KLabeledIcon>
            </div>
          </transition>
        </KFixedGridItem>
        <KFixedGridItem
          span="3"
          alignment="right"
        >
          <KButtonGroup style="margin-top: 8px">
            <KButton
              :text="coreString('cancelAction')"
              appearance="flat-button"
              :disabled="formDisabled || isSubmitChecking"
              @click="$emit('cancel')"
            />
            <KButton
              :text="coreString('continueAction')"
              :primary="true"
              :disabled="formDisabled || submitDisabled"
              type="submit"
            />
          </KButtonGroup>
        </KFixedGridItem>
      </KFixedGrid>
    </template>

    <KButtonGroup class="under-buttons">
      <slot name="underbuttons"></slot>
      <KButton
        v-show="!newDeviceButtonDisabled && !formDisabled"
        class="new-device-button"
        :text="getCommonSyncString('addNewAddressAction')"
        appearance="basic-link"
        @click="$emit('click_add_address')"
      />
    </KButtonGroup>
  </KModal>

</template>


<script>

  import { computed } from 'vue';
  import { useLocalStorage, get } from '@vueuse/core';
  import find from 'lodash/find';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import pickBy from 'lodash/pickBy';
  import { UnreachableConnectionStatuses } from './constants';
  import useDeviceDeletion from './useDeviceDeletion.js';
  import {
    useDevicesWithFilter,
    useDeviceChannelFilter,
    useDeviceFacilityFilter,
    useDeviceMinimumVersionFilter,
  } from './useDevices.js';
  import useConnectionChecker from './useConnectionChecker.js';

  export default {
    name: 'SelectDeviceForm',
    components: {
      UiAlert,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    setup(props, context) {
      const apiParams = {};
      const deviceFilters = [];

      if (props.filterByChannelId !== null) {
        deviceFilters.push(useDeviceChannelFilter({ id: props.filterByChannelId }));
      }

      const pickNotNull = v => v !== null;
      // Either we build a facility filter or an empty object.
      // Passing the empty object to useDeviceFacilityFilter is asking "are there ANY facilities?"
      const facilityFilter = pickBy(
        {
          id: props.filterByFacilityId,
          learner_can_sign_up: props.filterByFacilityCanSignUp,
          on_my_own_setup: props.filterByOnMyOwnFacility,
        },
        pickNotNull,
      );

      // If we're filtering a particular facility
      if (Object.keys(facilityFilter).length > 0 || props.filterByHasFacilities) {
        apiParams.subset_of_users_device = false;
        deviceFilters.push(useDeviceFacilityFilter(facilityFilter));
      }

      if (props.filterLODAvailable) {
        apiParams.subset_of_users_device = false;
        deviceFilters.push(useDeviceMinimumVersionFilter(0, 15, 0));
      }

      const {
        devices: _devices,
        isFetching,
        hasFetched,
        fetchFailed,
        forceFetch,
      } = useDevicesWithFilter(apiParams, deviceFilters);

      const { devices, isDeleting, deletingFailed, doDelete } = useDeviceDeletion(
        _devices,
        context,
      );

      const { isChecking, doCheck } = useConnectionChecker(devices);

      const storageDeviceId = useLocalStorage('kolibri-lastSelectedNetworkLocationId', '');

      const discoveredDevices = computed(() => get(devices).filter(d => d.dynamic));
      const savedDevices = computed(() => get(devices).filter(d => !d.dynamic));

      return {
        // useDevices
        devices,
        isFetching,
        hasFetched,
        fetchFailed,
        forceFetch,
        // useDeviceDeletion
        isDeleting,
        deletingFailed,
        doDelete,
        // useConnectionChecker
        isChecking,
        doCheck,
        // internal
        discoveredDevices,
        savedDevices,
        storageDeviceId,
      };
    },
    props: {
      // Facility filter only needed on SyncFacilityModalGroup
      // eslint-disable-next-line vue/no-unused-properties
      filterByFacilityId: {
        type: String,
        default: null,
      },
      // Channel filter only needed on ManageContentPage/SelectNetworkDeviceModal
      // eslint-disable-next-line vue/no-unused-properties
      filterByChannelId: {
        type: String,
        default: null,
      },
      // When this device is a Learn Only Device
      filterLODAvailable: {
        type: Boolean,
        default: false,
      },
      // When looking for devices for which a learner can sign up
      // eslint-disable-next-line vue/no-unused-properties
      filterByFacilityCanSignUp: {
        type: Boolean,
        default: null,
      },
      // In the setup wizard, to exclude importiing facilities that are "On My Own"
      // eslint-disable-next-line vue/no-unused-properties
      filterByOnMyOwnFacility: {
        type: Boolean,
        default: null,
      },
      // In the setup wizard, to exclude devices that do not have a facility
      // eslint-disable-next-line vue/no-unused-properties
      filterByHasFacilities: {
        type: Boolean,
        default: null,
      },
      // If an ID is provided, that device's radio button will be automatically selected
      selectedId: {
        type: String,
        default: null,
      },
      // Disables all the form controls
      formDisabled: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        selectedDeviceId: '',
        showUiAlerts: false,
        uiAlertText: null,
        isSubmitChecking: false,
      };
    },
    computed: {
      availableDeviceIds() {
        return this.devices
          .filter(
            device =>
              device.available &&
              (device.application === 'kolibri' || this.$route.path === '/content'),
          )
          .map(device => device.id);
      },
      isDeviceAvailable() {
        return function (deviceId) {
          return this.availableDeviceIds.some(id => id === deviceId);
        };
      },
      submitDisabled() {
        return Boolean(
          this.selectedDeviceId === '' ||
            this.isDeleting ||
            this.fetchFailed ||
            this.isSubmitChecking ||
            !this.isDeviceAvailable(this.selectedDeviceId) ||
            this.availableDeviceIds.length === 0,
        );
      },
      newDeviceButtonDisabled() {
        return !this.hasFetched;
      },
      uiAlertProps() {
        let text;
        if (this.uiAlertText) {
          text = this.uiAlertText;
        } else if (this.fetchFailed) {
          text = this.$tr('fetchingFailedText');
        } else if (this.deletingFailed) {
          text = this.$tr('deletingFailedText');
        } else {
          const unreachable = this.devices.find(d =>
            UnreachableConnectionStatuses.includes(d.connection_status),
          );
          if (unreachable) {
            text = this.getCommonSyncString('devicesUnreachable');
          }
        }
        return text ? { text, type: 'error' } : null;
      },
    },
    watch: {
      selectedDeviceId(newVal) {
        this.storageDeviceId = newVal;
      },
      availableDeviceIds() {
        if (!this.availableDeviceIds.includes(this.selectedDeviceId)) {
          this.selectedDeviceId = '';
        }
      },
      devices() {
        if (!this.selectedDeviceId) {
          this.resetSelectedDevice();
        }
      },
    },
    mounted() {
      // Wait a little bit of time before showing UI alerts so there is no flash
      // if data comes back quickly
      setTimeout(() => {
        this.showUiAlerts = true;
      }, 100);
    },
    methods: {
      formatBaseDevice(device) {
        const url = device.base_url;
        if (this.filterLODAvailable) {
          const version = device.kolibri_version.split('.').slice(0, 3).join('.');
          return `${url}, Kolibri ${version}`;
        } else return url;
      },
      resetSelectedDevice() {
        if (this.availableDeviceIds.length !== 0) {
          const selectedId = this.selectedId || this.storageDeviceId || this.selectedDeviceId;
          this.selectedDeviceId =
            this.availableDeviceIds.find(id => id === selectedId) || this.availableDeviceIds[0];
        } else {
          this.selectedDeviceId = '';
        }
      },
      handleSubmit() {
        if (!this.selectedDeviceId) {
          return;
        }

        const match = find(this.devices, { id: this.selectedDeviceId });
        if (!match) {
          this.uiAlertText = this.$tr('fetchingFailedText');
          return this.forceFetch();
        }

        this.uiAlertText = null;
        this.isSubmitChecking = true;

        // TODO: implement `DeviceConnectingModal`
        this.doCheck(match.id).then(device => {
          this.$emit('submit', device);
        });
      },
      removeSavedDevice(id) {
        return this.doDelete(id).then(() => {
          this.$emit('removed_address');
        });
      },
    },
    $trs: {
      deletingFailedText: {
        message: 'There was a problem removing this device',
        context:
          'Error message that displays when an admin attempts to remove a device, but is unable to do so.',
      },
      fetchingFailedText: {
        message: 'There was a problem getting the available devices',
        context:
          'Error message that displays when an admin attempts to find a device, but the device is not found.',
      },
      // TODO Update this string to be more specific that it is 0.15 or greater
      // once this is done, reinstate the $tr('lodSubHeader') in the template
      // eslint-disable-next-line kolibri/vue-no-unused-translations
      lodSubHeader: {
        message:
          'Select a device with Kolibri version 0.15 or greater to import learner user accounts',
        context:
          "In the first startup wizard, when you select to 'Import one or more user accounts from an existing facility' option to choose the device you want to sync from.\n\nYou do this in the 'Select device' section which displays a list of devices.",
      },
      noDeviceText: {
        message: 'There are no devices yet',
        context:
          "This message displays when there are no devices to sync with.\n\nIt appears when selecting 'SYNC' in the Device > Facilities section if there are no devices.",
      },
      refreshDevicesButtonLabel: {
        message: 'Refresh devices',
        context:
          'This message displays if there was a problem getting the devices. It allows the user to refresh the application to be able to see all the devices available.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .radio-button {
    display: inline-block;
    width: 75%;
  }

  .radio-button,
  .remove-device-button {
    vertical-align: middle;
  }

  .spinner-fade-leave-active,
  .spinner-fade-enter-active {
    transition: opacity 0.5s;
  }

  .spinnner-fade-enter-to,
  .spinner-fade-leave {
    opacity: 1;
  }

  .spinner-fade-enter,
  .spinner-fade-leave-to {
    opacity: 0;
  }

  .ui-progress-circular {
    display: inline-block;
    margin-right: 2px;
    margin-bottom: 2px;
    vertical-align: middle;
  }

  .loader {
    position: relative;
    top: 12px;
  }

  .under-buttons {
    /* align button group with the form content */
    margin-left: -8px;
  }

</style>
