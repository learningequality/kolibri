<template>

  <div>
    <span class="headercontainer">
      <h1>{{ $tr('documentTitle') }}</h1>

      <transition name="spinner-fade">

        <div v-if="discoveringPeers">
          <KLabeledIcon>
            <template #icon>
              <KCircularLoader :size="16" :stroke="6" />
            </template>
          </KLabeledIcon>
        </div>
      </transition>

    </span>
    <p v-if="initialFetchingComplete && !availableFacilities.length">
      {{ $tr('noFacilitiesText') }}
    </p>
    <div v-for="f in availableFacilities" :key="`div-${f.id}`">
      <KRadioButton
        :key="f.id"
        v-model="selectedFacilityId"
        :value="f.id"
        :label="formatNameAndId(f.name, f.id)"
        :disabled="facilityDisabled(f)"
      />
    </div>

    <KGrid
      :style="{
        marginTop: '34px',
        paddingTop: '10px',
        borderTop: `1px solid ${$themePalette.grey.v_300}`
      }"
    >

      <KGridItem>{{ $tr('doNotSeeYourFacility') }}</KGridItem>
      <KGridItem>
        <KButton
          :text="$tr('newAddressButtonLabel')"
          appearance="basic-link"
          @click="showAddAddressModal = true"
        />
      </KGridItem>
    </KGrid>

    <AddAddressForm
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

  import { useLocalStorage } from '@vueuse/core';
  import { computed, ref } from 'kolibri.lib.vueCompositionApi';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import useSavedAddresses from '../../../../../../core/assets/src/views/sync/SelectAddressModalGroup/useSavedAddresses.js';
  import useDynamicAddresses from '../../../../../../core/assets/src/views/sync/SelectAddressModalGroup/useDynamicAddresses.js';
  import AddAddressForm from '../../../../../../core/assets/src/views/sync/SelectAddressModalGroup/AddAddressForm';
  import useMinimumKolibriVersion from '../../../../../../core/assets/src/composables/useMinimumKolibriVersion';

  export default {
    name: 'SelectFacility',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: { AddAddressForm, BottomAppBar },

    mixins: [responsiveWindowMixin, commonCoreStrings, commonSyncElements],
    setup(props, context) {
      const {
        addresses: discoveredAddresses,
        discoveringPeers,
        discoveryFailed,
        discoveredAddressesInitiallyFetched,
      } = useDynamicAddresses(props);
      const {
        addresses: savedAddresses,
        refreshSavedAddressList,
        savedAddressesInitiallyFetched,
      } = useSavedAddresses(props, context);
      const combinedAddresses = computed(() => {
        return [...savedAddresses.value, ...discoveredAddresses.value];
      });
      const initialFetchingComplete = computed(() => {
        return savedAddressesInitiallyFetched.value && discoveredAddressesInitiallyFetched.value;
      });
      const storageFacilityId = useLocalStorage('kolibri-lastSelectedFacilityId', '');

      // data:
      const availableAddressIds = ref([]);
      const availableFacilities = ref([]);
      const selectedFacilityId = ref('');
      const showAddAddressModal = ref(false);

      // computed properties (functions):
      const { isMinimumKolibriVersion } = useMinimumKolibriVersion();
      const facilityDisabled = computed(() => {
        return function(facility) {
          return (
            discoveryFailed.value ||
            availableAddressIds.value.find(id => id == facility.address_id) === undefined ||
            !isMinimumKolibriVersion.value(facility.kolibri_version, 0, 16, 0)
          );
        };
      });

      // methods:
      function createSnackbar(args) {
        this.$store.dispatch('createSnackbar', args);
      }

      function handleAddedAddress() {
        refreshSavedAddressList();
        createSnackbar(this.$tr('addAddressSnackbarText'));
      }

      function resetSelectedAddress() {
        const enabledFacilities = availableFacilities.value.filter(f =>
          isMinimumKolibriVersion.value(f.kolibri_version, 0, 16)
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
        combinedAddresses,
        initialFetchingComplete,
        discoveredAddresses,
        discoveringPeers,
        savedAddresses,
        storageFacilityId,
        availableAddressIds,
        availableFacilities,
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
      combinedAddresses(addrs) {
        const availableDevices = addrs.filter(
          address =>
            address.available &&
            address.application === 'kolibri' &&
            !address.subset_of_users_device
        );
        const newDevices = availableDevices.filter(
          address => !this.availableAddressIds.includes(address.id)
        );
        newDevices.forEach(address => {
          client({
            url: urls['kolibri:core:remotefacilities'](),
            params: { baseurl: address.base_url },
          }).then(response => {
            response.data.forEach(facility => {
              const newFacility = {
                id: facility.id,
                name: facility.name,
                base_url: address.base_url,
                address_id: address.id,
                learner_can_sign_up: facility.learner_can_sign_up,
                learner_can_login_with_no_password: facility.learner_can_login_with_no_password,
                kolibri_version: address.kolibri_version,
              };
              if (!this.availableFacilities.find(f => f.id === facility.id))
                this.availableFacilities.push(newFacility);
            });
          });
          this.availableAddressIds = availableDevices.map(address => address.id);

          if (address.facility_name) {
            this.availableFacilities.push({
              id: address.id,
              name: address.facility_name,
            });
          }
        });

        if (!this.availableFacilities.map(f => f.id).includes(this.selectedFacilityId)) {
          this.selectedFacilityId = '';
        }
        if (!this.selectedFacilityId) {
          this.resetSelectedAddress();
        }
      },
    },
    $trs: {
      addAddressSnackbarText: {
        message: 'Successfully added address',
        context: 'This message appears if a network address has been added correctly.',
      },
      documentTitle: {
        message: 'Select learning facility',
        context: 'Title of this step for the change facility page.',
      },
      doNotSeeYourFacility: {
        message: 'Don’t see your learning facility?',
        context:
          'This text appears next to the "Add new address" link. This option allows you to add a new network address from which to sync data.',
      },
      newAddressButtonLabel: {
        message: 'Add new address',
        context:
          'The "Add new address" link appears in the \'Select network address\' screen. This option allows you to add a new network address from which to sync data.',
      },
      noFacilitiesText: {
        message: 'No learning facilities found',
        context:
          'This message displays when there are no accesible facilities found in the network. It can appear after the user selects to change to another existing facility.',
      },
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
