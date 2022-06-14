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
    <template v-for="f in availableFacilities">
      <div :key="`div-${f.id}`">
        <KRadioButton
          :key="f.id"
          v-model="selectedFacilityId"
          :value="f.id"
          :label="formatNameAndId(f.name, f.id)"
          :disabled="discoveryFailed || !isAddressAvailable(f.address_id)"
        />
      </div>

    </template>

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
  import { computed } from 'kolibri.lib.vueCompositionApi';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import useSavedAddresses from '../../../../../../core/assets/src/views/sync/SelectAddressModalGroup/useSavedAddresses.js';
  import useDynamicAddresses from '../../../../../../core/assets/src/views/sync/SelectAddressModalGroup/useDynamicAddresses.js';
  import AddAddressForm from '../../../../../../core/assets/src/views/sync/SelectAddressModalGroup/AddAddressForm';

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
        removeSavedAddress,
        refreshSavedAddressList,
        savedAddressesInitiallyFetched,
        requestsFailed,
        deletingAddress,
        fetchingAddresses,
      } = useSavedAddresses(props, context);
      const combinedAddresses = computed(() => {
        return [...savedAddresses.value, ...discoveredAddresses.value];
      });
      const initialFetchingComplete = computed(() => {
        return savedAddressesInitiallyFetched.value && discoveredAddressesInitiallyFetched.value;
      });
      const storageFacilityId = useLocalStorage('kolibri-lastSelectedFacilityId', '');
      return {
        combinedAddresses,
        initialFetchingComplete,
        discoveredAddresses,
        discoveryFailed,
        discoveringPeers,
        discoveredAddressesInitiallyFetched,
        savedAddresses,
        savedAddressesInitiallyFetched,
        removeSavedAddress,
        refreshSavedAddressList,
        requestsFailed,
        deletingAddress,
        fetchingAddresses,
        storageFacilityId,
      };
    },
    data() {
      return {
        availableAddressIds: [],
        availableFacilities: [],
        selectedFacilityId: '',
        showAddAddressModal: false,
      };
    },
    inject: ['changeFacilityService'],
    computed: {
      isAddressAvailable() {
        return function(addressId) {
          return Boolean(this.availableAddressIds.find(id => id === addressId));
        };
      },
    },
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
            url: urls['kolibri:kolibri.plugins.user_profile:remotefacilities'](),
            params: { baseurl: address.base_url },
          }).then(response => {
            response.data.forEach(facility => {
              const newFacility = {
                id: facility.id,
                name: facility.name,
                base_url: address.base_url,
                address_id: address.id,
                learner_can_sign_up: facility.learner_can_sign_up || true,
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
    methods: {
      createSnackbar(args) {
        this.$store.dispatch('createSnackbar', args);
      },
      handleAddedAddress() {
        this.refreshSavedAddressList();
        this.createSnackbar(this.$tr('addAddressSnackbarText'));
      },
      resetSelectedAddress() {
        if (this.availableFacilities.length !== 0) {
          const selectedId = this.selectedId || this.storageFacilityId || this.selectedFacilityId;
          this.selectedFacilityId =
            this.availableFacilities.map(f => f.id).find(f => f.id === selectedId) ||
            this.availableFacilities[0].id;
        } else {
          this.selectedFacilityId = '';
        }
      },
      to_continue() {
        this.changeFacilityService.send({
          type: 'CONTINUE',
        });
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
