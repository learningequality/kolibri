<template>

  <KModal
    :title="coreString('enterPinPlaceholder')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="submit"
    @cancel="$emit('cancel')"
  >
    <KTextbox
      ref="pinFocus"
      v-model="pin"
      input="number"
      :label="$tr('pinPlaceholder')"
      :maxlength="4"
      :invalid="showErrorText"
      :invalidText="pinError"
      :showInvalidText="showErrorText"
    />
  </KModal>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'PinAuthenticationModal',
    mixins: [commonCoreStrings],
    data() {
      return {
        pin: '',
        pinError: null,
        showErrorText: false,
      };
    },
    computed: {
      ...mapState('facilityConfig', ['isFacilityPinValid']),
    },
    methods: {
      ...mapActions('facilityConfig', ['isPinValid']),
      submit() {
        if (!this.pin.match(/^\d+$/)) {
          this.pinError = this.$tr('invalidPin');
          this.showErrorText = true;
          this.focus();
        } else {
          this.isPinValid({ pin_code: this.pin })
            .then(() => {
              if (this.isFacilityPinValid) {
                this.pinError = '';
                this.showErrorText = false;
                this.$emit('submit');
                this.showSnackbarNotification('pinAuthenticate');
              } else {
                this.pinError = this.$tr('incorrectPin');
                this.showErrorText = true;
              }
            })
            .catch(error => {
              this.pinError = error['response']['data'];
              this.showErrorText = true;
            });
        }
      },
      focus: function() {
        this.$refs.pinFocus.focus();
      },
    },
    $trs: {
      incorrectPin: {
        message: 'Incorrect PIN, please try again',
        context: 'Error message displayed when an incorrect PIN is input',
      },
      invalidPin: {
        message: 'Enter four numbers to set as your new PIN',
        context: 'Error message displayed when a PIN with less than 4 digits is input',
      },
      pinPlaceholder: {
        message: 'PIN',
        context: 'Placeholder label for a PIN input',
      },
    },
  };

</script>
