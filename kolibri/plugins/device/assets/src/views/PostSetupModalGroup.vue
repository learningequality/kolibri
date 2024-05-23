<template>

  <div>
    <WelcomeModal
      v-if="step === Steps.WELCOME && isUserLoggedIn"
      :importedFacility="importedFacility"
      :isOnMyOwnUser="isOnMyOwnUser"
      @submit="handleSubmit"
    />

    <PermissionsChangeModal
      v-if="step === Steps.PERMISSIONS_CHANGE"
      newRole="superadmin"
    />
    <AddDeviceForm
      v-if="addingAddress"
      @cancel="addingAddress = false"
      @added_address="handleAddedAddress"
    />
    <SelectDeviceForm
      v-else-if="step === Steps.SELECT_SOURCE_FACILITY_PEER"
      :title="getCommonSyncString('selectSourceTitle')"
      @submit="handleSubmit"
      @click_add_address="goToAddAddress"
      @cancel="$emit('cancel')"
    >
      <template #underbuttons>
        <KButton
          :text="$tr('chooseAnotherSourceLabel')"
          appearance="basic-link"
          @click="startNormalImportWorkflow"
        />
      </template>
    </SelectDeviceForm>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { SelectDeviceForm, AddDeviceForm } from 'kolibri.coreVue.componentSets.sync';
  import { availableChannelsPageLink } from './ManageContentPage/manageContentLinks';
  import WelcomeModal from './WelcomeModal';
  import PermissionsChangeModal from './PermissionsChangeModal';

  const facilityImported = 'FACILITY_IS_IMPORTED';

  const Steps = Object.freeze({
    WELCOME: 'WELCOME',
    PERMISSIONS_CHANGE: 'PERMISSIONS_CHANGE',
    SELECT_SOURCE_FACILITY_PEER: 'SELECT_SOURCE_FACILITY_PEER',
    SELECT_SOURCE_NORMAL: 'SELECT_SOURCE_NORMAL',
  });

  export default {
    name: 'PostSetupModalGroup',
    components: {
      AddDeviceForm,
      PermissionsChangeModal,
      WelcomeModal,
      SelectDeviceForm,
    },
    mixins: [commonSyncElements],
    props: {
      isOnMyOwnUser: {
        type: Boolean,
        required: false,
      },
    },
    data() {
      return {
        step: Steps.WELCOME,
        Steps,
        addingAddress: false,
        addedAddressId: '',
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      importedFacility() {
        const [facility] = this.$store.state.core.facilities;
        if (facility && window.sessionStorage.getItem(facilityImported) === 'true') {
          return facility;
        }
        return null;
      },
    },
    methods: {
      createSnackbar(args) {
        this.$store.dispatch('createSnackbar', args);
      },
      startNormalImportWorkflow() {
        this.$emit('cancel');
        this.$store.dispatch('manageContent/startImportWorkflow');
      },
      goToSelectAddress() {
        this.addingAddress = false;
      },
      goToAddAddress() {
        this.addedAddressId = '';
        this.addingAddress = true;
      },
      handleAddedAddress(addressId) {
        this.addedAddressId = addressId;
        this.createSnackbar(this.$tr('addDeviceSnackbarText'));
        this.goToSelectAddress();
      },
      handleSubmit(data) {
        if (this.step === Steps.WELCOME) {
          if (this.importedFacility) {
            this.step = Steps.SELECT_SOURCE_FACILITY_PEER;
          } else {
            this.$emit('cancel');
          }
        } else if (this.step === Steps.SELECT_SOURCE_FACILITY_PEER) {
          this.$emit('cancel');
          const newRoute = availableChannelsPageLink({ addressId: data.id });
          newRoute.query.setup = true;
          this.$router.push(newRoute);
        }
      },
    },
    $trs: {
      chooseAnotherSourceLabel: {
        message: 'Choose another source',
        context:
          'Button that opens the modal to choose source for content import workflow from Kolibri Studio or an attached local drive',
      },
      addDeviceSnackbarText: {
        message: 'Successfully added device',
        context: 'This message appears if a device has been added correctly.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
