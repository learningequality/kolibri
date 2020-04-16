<template>

  <KModal
    :title="$tr('registerFacility')"
    :submitText="$tr('register')"
    :cancelText="alreadyRegistered ? coreString('closeAction') : coreString('cancelAction')"
    @submit="registerFacility"
    @cancel="closeModal"
  >
    <template v-if="!alreadyRegistered">
      <p>{{ $tr('registerWith', { name: projectName }) }}</p>
      <p>{{ $tr('dataSaved') }}</p>
    </template>

    <template v-else>
      {{ $tr('alreadyRegistered', { name: projectName }) }}
    </template>

  </KModal>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import { FacilityDatasetResource, PortalResource } from 'kolibri.resources';

  export default {
    name: 'ConfirmationRegisterModal',
    mixins: [commonCoreStrings],
    data() {
      return {
        alreadyRegistered: false,
      };
    },
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
              this.alreadyRegistered = true;
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
      alreadyRegistered: {
        message: "Already registered with '{name}'",
        context:
          '\nOnce a facility has been registered on the Kolibri Data Portal, if admin makes a second attempt to register, Kolibri will reply with this reminder that the facility has already been registered with a project called {name}.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

</style>
