<template>

  <div>
    <WelcomeModal
      v-if="step === Steps.WELCOME && isUserLoggedIn && onboardingComplete === false"
      :importedFacility="importedFacility"
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

  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import SelectDeviceForm from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/SelectDeviceForm';
  import AddDeviceForm from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup/AddDeviceForm';
  import useUser from 'kolibri/composables/useUser';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { availableChannelsPageLink } from './ManageContentPage/manageContentLinks';
  import WelcomeModal from './WelcomeModal';
  import PermissionsChangeModal from './PermissionsChangeModal';
import { mapState } from 'vuex';
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
    setup() {
      const { isUserLoggedIn } = useUser();
      const { createSnackbar } = useSnackbar();
      const { facilities } = useFacilities();

      return {
        isUserLoggedIn,
        createSnackbar,
        facilities,
      };
    },
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
      ...mapState({
      onboardingComplete: state => state.session.onboarding_complete,
    }),
      importedFacility() {
        const [facility] = this.facilities;
        if (facility && window.sessionStorage.getItem(facilityImported) === 'true') {
          return facility;
        }
        return null;
      },
    },
    methods: {
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
      /*handleSubmit(data) {
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
      },*/
      async handleSubmit(data) {
    if (this.step === Steps.WELCOME) {
      // 1. Update onboarding_complete in backend
      try {
        const userId = this.$store.state.session.user_id;
        await client({
          url: urls['kolibri:core:facilityuser_detail'](userId),
          method: 'patch',
          data: { onboarding_complete: true },
        });
        // 2. Optionally, update Vuex session state immediately
        this.$store.commit('CORE_SET_SESSION', { onboarding_complete: true });
      } catch (e) {
        // handle error if needed
        console.error('Failed to set onboarding_complete:', e);
      }

      // 3. Continue with your existing logic
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
