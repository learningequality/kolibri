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
      <p v-if="filterLODAvailable">
        {{ $tr('lodSubHeader') }}
      </p>
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
      <template v-if="anySavedDeviceSeen">
        <template v-for="(d, idx) in savedDevices">
          <div :key="`div-${idx}`">
            <KRadioButton
              v-if="canLearnerSignUp(d.id)"
              :key="idx"
              v-model="selectedDeviceId"
              class="radio-button"
              :value="d.id"
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
      </template>

      <hr
        v-if="savedDevices.length > 0 && discoveredDevices.length > 0"
        :style="{ border: 0, borderBottom: `1px solid ${$themeTokens.fineLine}` }"
      >

      <!-- Dynamic Devices -->
      <template v-if="anyDiscoveredDeviceSeen()">
        <template v-for="d in discoveredDevices">
          <div :key="`div-${d.id}`">
            <KRadioButton
              v-if="canLearnerSignUp(d.id)"
              :key="d.id"
              v-model="selectedDeviceId"
              class="radio-button"
              :value="d.instance_id"
              :label="formatNameAndId(d.device_name, d.id)"
              :description="formatBaseDevice(d)"
              :disabled="formDisabled || fetchFailed || !isDeviceAvailable(d.id)"
            />
          </div>
        </template>
      </template>
      <template v-else>
        <p> {{ $tr('noDeviceText') }} </p>
      </template>
    </template>

    <slot name="underbuttons"></slot>

    <template #actions>
      <KFixedGrid class="actions" numCols="4">
        <KFixedGridItem span="1">
          <transition name="spinner-fade">
            <div v-if="isFetching || isChecking">
              <KLabeledIcon>
                <template #icon>
                  <KCircularLoader :size="16" :stroke="6" class="loader" />
                </template>
              </KLabeledIcon>
            </div>
          </transition>
        </KFixedGridItem>
        <KFixedGridItem span="3" alignment="right">
          <KButtonGroup style="margin-top: 8px;">
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

    <KButton
      v-show="!newDeviceButtonDisabled && !formDisabled"
      class="new-device-button"
      :text="getCommonSyncString('addNewAddressAction')"
      appearance="basic-link"
      @click="$emit('click_add_address')"
    />

  </KModal>

</template>


<script>

  import { NetworkLocationResource } from 'kolibri.resources';
  import { computed, ref } from 'kolibri.lib.vueCompositionApi';
  import { useLocalStorage, get, useMemoize, computedAsync } from '@vueuse/core';
  import find from 'lodash/find';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { UnreachableConnectionStatuses } from './constants';
  import useDeviceDeletion from './useDeviceDeletion.js';
  import useDevices, {
    useDevicesWithChannel,
    useDevicesWithFacility,
    useDevicesForLearnOnlyDevice,
  } from './useDevices.js';
  import useConnectionChecker from './useConnectionChecker.js';

  export default {
    name: 'SelectDeviceForm',
    components: {
      UiAlert,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    setup(props, context) {
      // We don't have a use case for combining these at the moment
      if (
        (props.filterByChannelId !== null && props.filterByFacilityId !== null) ||
        ((props.filterByChannelId !== null || props.filterByFacilityId !== null) &&
          props.filterLODAvailable)
      ) {
        throw new Error('Filtering for LOD and having channel or facility is not implemented');
      }

      let useDevicesResult = null;
      if (props.filterByChannelId !== null) {
        useDevicesResult = useDevicesWithChannel(props.filterByChannelId);
      } else if (props.filterByFacilityId !== null) {
        // This is inherently filtered to full-facility devices
        useDevicesResult = useDevicesWithFacility(props.filterByFacilityId);
      } else if (props.filterLODAvailable) {
        useDevicesResult = useDevicesForLearnOnlyDevice();
      } else {
        useDevicesResult = useDevices();
      }

      const {
        devices: _devices,
        isFetching,
        hasFetched,
        fetchFailed,
        forceFetch,
      } = useDevicesResult;

      const { devices, isDeleting, hasDeleted, deletingFailed, doDelete } = useDeviceDeletion(
        _devices,
        context
      );

      const { isChecking, doCheck } = useConnectionChecker(devices);

      const storageDeviceId = useLocalStorage('kolibri-lastSelectedNetworkLocationId', '');

      const discoveredDevices = computed(() => get(devices).filter(d => d.dynamic));
      const savedDevices = computed(() => get(devices).filter(d => !d.dynamic));

      const fetchDeviceFacilities = useMemoize(
        async device => {
          try {
            const { facilities } = await NetworkLocationResource.fetchFacilities(device.id);

            return facilities.map(facility => {
              return {
                id: facility.id,
                name: facility.name,
                base_url: device.base_url,
                address_id: device.id,
                learner_can_sign_up: facility.learner_can_sign_up,
                learner_can_login_with_no_password: facility.learner_can_login_with_no_password,
                kolibri_version: device.kolibri_version,
              };
            });
          } catch (e) {
            return [];
          }
        },
        {
          getKey: device => device.id,
        }
      );

      const isLoading = ref(false);

      const availableAddressIds = computed(() =>
        get(devices)
          .filter(d => d.available)
          .map(d => d.id)
      );

      const availableFacilities = computedAsync(
        async () => {
          // Extract available devices, and sort to most recently accessed so when we dedupe
          // facilities across two+ devices, the most recently connected device's facility is shown
          const _devices = get(devices)
            .filter(d => get(availableAddressIds).includes(d.id))
            .sort((deviceA, deviceB) => deviceA.since_last_accessed - deviceB.since_last_accessed);
          const facilitiesFromDevices = await Promise.all(
            _devices.map(d => fetchDeviceFacilities(d))
          );
          const facilities = {};
          // Promise.all will resolve with an array of arrays
          for (const deviceFacilities of facilitiesFromDevices) {
            for (const facility of deviceFacilities) {
              // deduplicate the same facility across more than one device
              if (!facility[facility.id]) {
                facilities[facility.id] = facility;
              }
            }
          }
          // Sort alphabetically for predictable ordering
          return Object.values(facilities).sort((facilityA, facilityB) => {
            if (facilityA.name < facilityB.name) {
              return -1;
            }
            if (facilityA.name > facilityB.name) {
              return 1;
            }
            return 0;
          });
        },
        [],
        isLoading
      );

      return {
        // useDevices
        devices,
        isFetching,
        hasFetched,
        fetchFailed,
        forceFetch,
        // useDeviceDeletion
        isDeleting,
        hasDeleted,
        deletingFailed,
        doDelete,
        // useConnectionChecker
        isChecking,
        doCheck,
        // internal
        discoveredDevices,
        savedDevices,
        storageDeviceId,
        availableFacilities,
      };
    },
    props: {
      // Facility filter only needed on SyncFacilityModalGroup
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      filterByFacilityId: {
        type: String,
        default: null,
      },
      // Channel filter only needed on ManageContentPage/SelectNetworkDeviceModal
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      filterByChannelId: {
        type: String,
        default: null,
      },
      // When this device is a Learn Only Device
      filterLODAvailable: {
        type: Boolean,
        default: false,
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
              (device.application === 'kolibri' || this.$route.path === '/content')
          )
          .map(device => device.id);
      },
      isDeviceAvailable() {
        return function(deviceId) {
          return Boolean(this.availableDeviceIds.find(id => id === deviceId));
        };
      },
      submitDisabled() {
        return Boolean(
          this.selectedDeviceId === '' ||
            this.isDeleting ||
            this.fetchFailed ||
            this.isSubmitChecking ||
            this.availableDeviceIds.length === 0
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
            UnreachableConnectionStatuses.includes(d.connection_status)
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
          const version = device.kolibri_version
            .split('.')
            .slice(0, 3)
            .join('.');
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
      canLearnerSignUp(id) {
        for (const facility of this.availableFacilities) {
          console.log("can learner working")
          console.log(id);
          console.log(facility.address_id);
          if (facility.address_id === id) {
            console.log(facility.learner_can_sign_up)
            return facility.learner_can_sign_up;
          }
        }
        return false;
      },
      anyDiscoveredDeviceSeen() {
        for (const device of this.discoveredDevices) {
          if (this.canLearnerSignUp(device.id)) {
            return true;
          }
        }
        return false;
      },
      anySavedDeviceSeen() {
        for (const device of this.savedDevices) {
          if (this.canLearnerSignUp(device.id)) {
            return true;
          }
        }
        return false;
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
      lodSubHeader: {
        message: 'Select a device with Kolibri version 0.15 to import learner user accounts',
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

</style>
