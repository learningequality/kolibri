<template>

  <KModal
    :title="$tr('registerFacility')"
    :submitText="$tr('register')"
    :cancelText="$tr('cancel')"
    @submit="registerFacility"
    @cancel="closeModal"
  >
    <p>{{ $tr('registerWith', {name: projectName}) }}</p>
    <p>{{ $tr('dataSaved') }}</p>

  </KModal>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import { FacilityDatasetResource } from 'kolibri.resources';
  import { PortalResource } from '../../../apiResources';
  import { Modals } from '../../../constants';

  export default {
    name: 'ConfirmationRegisterModal',
    computed: {
      ...mapState('manageSync', ['projectName', 'targetFacility', 'token']),
    },
    methods: {
      ...mapActions('manageSync', ['displayModal']),
      closeModal() {
        this.$emit('cancel');
      },
      registerFacility() {
        this.submitting = true;
        PortalResource.registerFacility({
          facility_id: this.targetFacility.id,
          name: this.targetFacility.name,
          token: this.token,
        })
          .then(() => {
            FacilityDatasetResource.saveModel({
              id: this.targetFacility.dataset.id,
              data: { registered: true },
              exists: true,
            }).then(() => {
              this.$store.commit('manageCSV/SET_REGISTERED', this.targetFacility);
              this.submitting = false;
              this.displayModal(false);
            });
          })
          .catch(error => {
            const errorsCaught = CatchErrors(error, [
              ERROR_CONSTANTS.ALREADY_REGISTERED_FOR_COMMUNITY,
            ]);
            if (errorsCaught) {
              this.submitting = false;
              this.displayModal(Modals.ALREADY_REGISTERED);
            } else {
              this.$store.dispatch('handleApiError', error);
            }
          });
      },
    },
    $trs: {
      registerFacility: 'Register facility',
      register: 'Register',
      registerWith: {
        message: "Register with '{name}'?",
        context:
          '\nKolibri is asking for a confirmation before registering the facility with a project called {name}.',
      },
      dataSaved: 'Data will be saved to the cloud',
      cancel: 'Cancel',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

</style>
