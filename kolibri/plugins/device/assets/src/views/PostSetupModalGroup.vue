<template>

  <div>
    <WelcomeModal
      v-if="step === Steps.WELCOME"
      :importedFacility="importedFacility"
      @submit="handleSubmit"
    />

    <PermissionsChangeModal
      v-if="step === Steps.PERMISSIONS_CHANGE"
      newRole="superadmin"
    />

    <SelectAddressForm
      v-else-if="step === Steps.SELECT_SOURCE_FACILITY_PEER"
      :title="getCommonSyncString('selectSourceTitle')"
      hideSavedAddresses
      @submit="handleSubmit"
      @cancel="$emit('cancel')"
    >
      <template #underbuttons>
        <KButton
          :text="$tr('chooseAnotherSourceLabel')"
          appearance="basic-link"
          @click="startNormalImportWorkflow"
        />
      </template>
    </SelectAddressForm>
  </div>

</template>


<script>

  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { SelectAddressForm } from 'kolibri.coreVue.componentSets.sync';
  import { availableChannelsPageLink } from './ManageContentPage/manageContentLinks';
  import WelcomeModal from './WelcomeModal';
  import PermissionsChangeModal from './PermissionsChangeModal';

  const Steps = Object.freeze({
    WELCOME: 'WELCOME',
    PERMISSIONS_CHANGE: 'PERMISSIONS_CHANGE',
    SELECT_SOURCE_FACILITY_PEER: 'SELECT_SOURCE_FACILITY_PEER',
    SELECT_SOURCE_NORMAL: 'SELECT_SOURCE_NORMAL',
  });

  export default {
    name: 'PostSetupModalGroup',
    components: {
      PermissionsChangeModal,
      WelcomeModal,
      SelectAddressForm,
    },
    mixins: [commonSyncElements],
    data() {
      return {
        step: Steps.WELCOME,
        Steps,
      };
    },
    computed: {
      // Assume that if first facility has non-null 'last_synced'
      // field, then it was imported in Setup Wizard.
      // This used to determine Select Source workflow to enter into
      importedFacility() {
        const [facility] = this.$store.state.core.facilities;
        if (facility && facility.last_synced !== null) {
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
      handleSubmit(data) {
        if (this.step === Steps.WELCOME) {
          if (this.importedFacility) {
            this.step = Steps.SELECT_SOURCE_FACILITY_PEER;
          } else {
            this.$emit('cancel');
          }
        } else if (this.step === Steps.SELECT_SOURCE_FACILITY_PEER) {
          this.$emit('cancel');
          let newRoute = availableChannelsPageLink({ addressId: data.id });
          newRoute.query.setup = true;
          this.$router.push(newRoute);
        }
      },
    },
    $trs: {
      chooseAnotherSourceLabel: {
        message: 'Choose another source',
        context:
          'Button that opens the modal to choose source for content import workflow from Studio or an attached local drive',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
