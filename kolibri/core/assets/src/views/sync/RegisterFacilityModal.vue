<template>

  <KModal
    :title="$tr('registerFacility')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="submitting"
    @submit="validateToken"
    @cancel="closeModal"
  >
    <p>{{ $tr('enterToken') }}</p>
    <KTextbox
      v-model="token"
      type="text"
      :label="$tr('projectToken')"
      :autofocus="true"
      :invalid="invalid"
      :invalidText="$tr('invalidToken')"
      @input="invalid = false"
    />
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import { PortalResource } from 'kolibri.resources';

  export default {
    name: 'RegisterFacilityModal',
    mixins: [commonCoreStrings],
    data() {
      return {
        submitting: false,
        token: null,
        invalid: false,
      };
    },
    methods: {
      closeModal() {
        this.$emit('cancel');
      },
      validateToken() {
        // TODO synchronously handle empty strings
        const strippedToken = this.token.replace('-', '');
        this.submitting = true;
        PortalResource.validateToken(strippedToken)
          .then(response => {
            this.submitting = false;
            this.$emit('success', {
              name: response.data.name,
              token: strippedToken,
            });
          })
          .catch(error => {
            const errorsCaught = CatchErrors(error, [
              ERROR_CONSTANTS.INVALID_KDP_REGISTRATION_TOKEN,
            ]);
            if (errorsCaught) {
              this.invalid = true;
              this.submitting = false;
            } else {
              this.$store.dispatch('handleApiError', error);
            }
          });
      },
    },
    $trs: {
      registerFacility: {
        message: 'Register facility',
        context: "An action that describes 'registering' a facility to the Kolibri Data Portal.",
      },
      enterToken: {
        message: 'Enter a project token from Kolibri Data Portal',
        context:
          'If the Kolibri facility is part of a larger organization that tracks data on the Kolibri Data Portal, an admin may receive a project token to sync the facility data with the organization in the cloud.\n\nThis text is a prompt that appears on the Sync Facility Data screen where the admin would enter this project token.\n\nThe project token is usually composed of a short sequence of characters.',
      },
      projectToken: {
        message: 'Project token',
        context:
          'If the Kolibri facility is part of a larger organization that tracks data on the Kolibri Data Portal, the admin may receive a project token to sync the facility data with the organization in the cloud.\n\nThe project token is usually composed of a short sequence of characters.',
      },
      invalidToken: {
        message: 'Invalid token',
        context:
          "This is an error message that displays when an admin enters an incorrect project token on the 'Sync Facility Data' screen.\n\nThe project token is usually composed of a short sequence of characters.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

</style>
