<template>

  <div>
    <span class="headercontainer">
      <h1>{{ getCommonSyncString('selectFacilityTitle') }}</h1>

      <transition name="spinner-fade">

        <div v-if="isFetching">
          <KLabeledIcon>
            <template #icon>
              <KCircularLoader :size="16" :stroke="6" />
            </template>
          </KLabeledIcon>
        </div>
      </transition>

    </span>
    <p v-if="hasFetched && !availableFacilities.length">
      {{ $tr('noFacilitiesText') }}
    </p>
    <div v-for="f in availableFacilities" :key="`div-${f.id}`">
      <KRadioButton
        :key="f.id"
        v-model="selectedFacilityId"
        :buttonValue="f.id"
        :label="formatNameAndId(f.name, f.id)"
        :disabled="facilityDisabled(f)"
      />
    </div>

    <KGrid
      :style="{
        marginTop: '34px',
        paddingTop: '10px',
        borderTop: `1px solid ${$themeTokens.fineLine}`
      }"
    >

      <KGridItem>{{ $tr('doNotSeeYourFacility') }}</KGridItem>
      <KGridItem>
        <KButton
          :text="getCommonSyncString('addNewAddressAction')"
          appearance="basic-link"
          @click="showAddAddressModal = true"
        />
      </KGridItem>
    </KGrid>

    <AddDeviceForm
      v-if="showAddAddressModal"
      @cancel="showAddAddressModal = false"
      @added_address="handleAddedAddress"
    />
    <BottomAppBar>
      <slot name="buttons">
        <KButtonGroup>
          <KButton
            :primary="true"
            :text="coreString('continueAction')"
            :disabled="selectedFacilityId === ''"
            @click="to_continue"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>

  </div>

</template>


<script>

  import { useLocalStorage, useMemoize, computedAsync, get } from '@vueuse/core';
  import { computed, getCurrentInstance, ref, watch } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { NetworkLocationResource } from 'kolibri.resources';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import useMinimumKolibriVersion from 'kolibri.coreVue.composables.useMinimumKolibriVersion';
  import { AddDeviceForm, useDevices, useDeviceDeletion } from 'kolibri.coreVue.componentSets.sync';
  import commonProfileStrings from '../commonProfileStrings';

  export default {
    name: 'SelectFacility',
    metaInfo() {
      return {
        title: this.getCommonSyncString('selectFacilityTitle'),
      };
    },
    components: { AddDeviceForm, BottomAppBar },

    mixins: [commonCoreStrings, commonSyncElements, commonProfileStrings],
    setup() {
      const {
        devices: _devices,
        isFetching: _isFetching,
        hasFetched,
        fetchFailed,
        forceFetch,
      } = useDevices({
        subset_of_users_device: false,
      });

      const { devices, isDeleting, hasDeleted, deletingFailed, doDelete } = useDeviceDeletion(
        _devices
      );

      const storageFacilityId = useLocalStorage('kolibri-lastSelectedFacilityId', '');

      // data:
      const selectedFacilityId = ref('');
      const showAddAddressModal = ref(false);
      const isLoading = ref(false);
      const $store = getCurrentInstance().proxy.$store;

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

      // computed properties (functions):
      const isFetching = computed(() => get(_isFetching) || get(isLoading));
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
        { evaluating: isLoading, shallow: false }
      );

      const { isMinimumKolibriVersion } = useMinimumKolibriVersion(0, 16, 0);
      const facilityDisabled = computed(() => {
        return function(facility) {
          return (
            get(fetchFailed) ||
            get(availableAddressIds).find(id => id === facility.address_id) === undefined ||
            !isMinimumKolibriVersion(facility.kolibri_version)
          );
        };
      });

      watch(availableFacilities, availableFacilities => {
        if (
          !get(availableFacilities)
            .map(f => f.id)
            .includes(selectedFacilityId.value)
        ) {
          selectedFacilityId.value = '';
        }
        if (!selectedFacilityId.value) {
          resetSelectedAddress();
        }
      });

      // methods:
      function createSnackbar(args) {
        $store.dispatch('createSnackbar', args);
      }

      function handleAddedAddress() {
        forceFetch();
        createSnackbar(this.$tr('addDeviceSnackbarText'));
        this.showAddAddressModal = false;
      }

      function resetSelectedAddress() {
        const enabledFacilities = availableFacilities.value.filter(f =>
          isMinimumKolibriVersion(f.kolibri_version)
        );
        if (enabledFacilities.length !== 0) {
          const selectedId = storageFacilityId.value || selectedFacilityId.value;
          selectedFacilityId.value =
            enabledFacilities.map(f => f.id).find(f => f === selectedId) || enabledFacilities[0].id;
        } else {
          selectedFacilityId.value = '';
        }
      }

      function to_continue() {
        this.changeFacilityService.send({
          type: 'CONTINUE',
        });
      }

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

        // internal
        fetchDeviceFacilities,
        availableFacilities,
        availableAddressIds,
        storageFacilityId,
        selectedFacilityId,
        showAddAddressModal,
        facilityDisabled,
        handleAddedAddress,
        resetSelectedAddress,
        to_continue,
      };
    },
    inject: ['changeFacilityService'],

    watch: {
      selectedFacilityId(newVal) {
        this.storageFacilityId = newVal;
        const facility = this.availableFacilities.find(f => f.id === newVal);
        this.changeFacilityService.send({
          type: 'SELECTFACILITY',
          value: {
            name: facility.name,
            url: facility.base_url,
            id: facility.id,
            learner_can_sign_up: facility.learner_can_sign_up,
            learner_can_login_with_no_password: facility.learner_can_login_with_no_password,
          },
        });
      },
    },
    $trs: {
      addDeviceSnackbarText: {
        message: 'Successfully added device',
        context: 'This message appears if a device has been added correctly.',
      },
      doNotSeeYourFacility: {
        message: "Don't see your learning facility?",
        context:
          'This text appears next to the "Add new address" link. This option allows you to add a new network address from which to sync data.',
      },
      noFacilitiesText: {
        message: 'No learning facilities found',
        context:
          'This message displays when there are no accessible facilities found in the network. It can appear after the user selects to change to another existing facility.',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      noPermissionToJoinFacility: {
        message: "You don't have permission to join this learning facility",
        context: '',
      },
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped>

  .headercontainer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

</style>
