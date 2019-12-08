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
              name: response.entity.name,
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
      registerFacility: 'Register facility',
      enterToken: 'Enter a project token from Kolibri Data Portal',
      projectToken: 'Project token',
      invalidToken: 'Invalid token',
    },
  };

</script>


<style lang="scss" scoped></style>

  @import '~kolibri-design-system/lib/styles/definitions';

</style>
