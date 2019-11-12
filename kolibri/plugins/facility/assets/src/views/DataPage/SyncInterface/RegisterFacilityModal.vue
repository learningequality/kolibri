<template>

  <KModal
    :title="$tr('registerFacility')"
    :submitText="$tr('continue')"
    :cancelText="$tr('cancel')"
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
      :invalidText="tokenIsInvalidText"
      @input="invalid = false"
    />
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import { PortalResource } from '../../../apiResources';
  import { Modals } from '../../../constants';

  export default {
    name: 'RegisterFacilityModal',
    data() {
      return {
        submitting: false,
        token: null,
        invalid: false,
      };
    },
    computed: {
      tokenIsInvalidText() {
        return this.$tr('invalidToken');
      },
    },
    methods: {
      ...mapActions('manageSync', ['displayModal']),
      closeModal() {
        this.$emit('cancel');
      },
      validateToken() {
        const strippedToken = this.token.replace('-', '');
        this.submitting = true;
        PortalResource.validateToken(strippedToken)
          .then(response => {
            this.submitting = false;
            this.$store.commit('manageSync/SET_PROJECT_NAME', response.entity.name);
            this.$store.commit('manageSync/SET_TOKEN', strippedToken);
            this.displayModal(Modals.CONFIRMATION_REGISTER);
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
      continue: 'Continue',
      cancel: 'Cancel',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

</style>
