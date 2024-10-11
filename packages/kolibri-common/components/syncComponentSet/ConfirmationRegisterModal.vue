<template>

  <KModal
    :title="$tr('registerFacility')"
    :submitText="registerText"
    :cancelText="cancelText"
    @submit="registerFacility"
    @cancel="cancel"
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

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri/constants';
  import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
  import PortalResource from 'kolibri-common/apiResources/PortalResource';

  export default {
    name: 'ConfirmationRegisterModal',
    mixins: [commonCoreStrings],
    props: {
      projectName: {
        type: String,
        required: true,
      },
      targetFacility: {
        type: Object,
        required: true,
      },
      token: {
        type: String,
        required: true,
      },
      /**
       * Whether or not the modal should emit a success event
       * after the facility has been discovered to be already registered.
       */
      successOnAlreadyRegistered: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data() {
      return {
        alreadyRegistered: false,
      };
    },
    computed: {
      cancelText() {
        return this.alreadyRegistered
          ? this.coreString('closeAction')
          : this.coreString('cancelAction');
      },
      registerText() {
        return this.alreadyRegistered ? null : this.coreString('registerAction');
      },
    },
    methods: {
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
              this.$emit('success', this.targetFacility);
              this.submitting = false;
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
              this.$store.dispatch('handleApiError', { error });
            }
          });
      },
      cancel() {
        if (this.alreadyRegistered && this.successOnAlreadyRegistered) {
          this.$emit('success', this.targetFacility);
        } else {
          this.$emit('cancel');
        }
      },
    },
    $trs: {
      registerFacility: {
        message: 'Register facility',
        context: "An action that describes 'registering' a facility to the Kolibri Data Portal.",
      },
      registerWith: {
        message: "Register with '{name}'?",
        context:
          'Kolibri is asking for a confirmation before registering the facility with a project called {name}.',
      },
      dataSaved: {
        message: 'Data will be saved to the cloud',
        context:
          'Message indicating that facility data will be synced with the organization in the cloud.',
      },
      alreadyRegistered: {
        message: "Already registered with '{name}'",
        context:
          'Once a facility has been registered on the Kolibri Data Portal, if admin makes a second attempt to register, Kolibri will reply with this reminder that the facility has already been registered with a project called {name}.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

</style>
