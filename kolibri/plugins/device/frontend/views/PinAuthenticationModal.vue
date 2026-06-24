<template>

  <KModal
    :title="coreString('enterPinPlaceholder')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="submit"
    @cancel="cancel"
  >
    <KTextbox
      ref="pinFocus"
      v-model="pin"
      input="number"
      type="password"
      :label="pinPlaceholder$()"
      :maxlength="4"
      :invalid="showErrorText"
      :invalidText="pinError"
      :showInvalidText="showErrorText"
    />
  </KModal>

</template>


<script>

  import { ref } from 'vue';
  import client from 'kolibri/client';
  import urls from 'kolibri/urls';
  import { createTranslator } from 'kolibri/utils/i18n';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export const strings = createTranslator('PinAuthenticationModal', {
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
  });

  export default {
    name: 'PinAuthenticationModal',
    mixins: [commonCoreStrings],
    setup(props, { emit }) {
      const pin = ref('');
      const showErrorText = ref(false);
      const pinError = ref(null);
      const pinFocus = ref(null);
      const { coreString, showSnackbarNotification } = commonCoreStrings.methods;
      const { incorrectPin$, pinPlaceholder$ } = strings;

      function focus() {
        if (pinFocus.value) {
          pinFocus.value.focus();
        }
      }

      /**
       * Validate a PIN code against a facility dataset.
       * @param {string} pinCode - The 4-digit PIN to validate.
       * @returns {Promise<boolean>} - True if PIN is valid, false otherwise.
       */
      async function validatePin(pinCode) {
        const response = await client({
          url: urls['kolibri:core:ispinvalid'](props.facilityDatasetId),
          method: 'POST',
          data: { pin_code: pinCode },
        });
        return response.data.is_pin_valid;
      }

      /**
       * Submit pin for validation and handle response.
       * @returns {Promise<void>}
       */
      async function submit() {
        if (!pin.value) {
          pinError.value = coreString('requiredFieldError');
          showErrorText.value = true;
          focus();
        } else if (!pin.value.match(/^\d+$/)) {
          pinError.value = coreString('numbersOnly');
          showErrorText.value = true;
          focus();
        } else {
          try {
            const valid = await validatePin(pin.value);
            if (valid) {
              pinError.value = '';
              showErrorText.value = false;
              emit('submit');
              showSnackbarNotification('pinAuthenticate');
            } else {
              pinError.value = incorrectPin$();
              showErrorText.value = true;
            }
          } catch (error) {
            pinError.value = error['response']['data'];
            showErrorText.value = true;
          }
        }
      }

      function cancel() {
        emit('cancel');
      }

      return {
        pin,
        pinError,
        pinFocus,
        pinPlaceholder$,
        showErrorText,
        submit,
        cancel,
      };
    },
    props: {
      facilityDatasetId: {
        type: String,
        required: true,
      },
    },
  };

</script>
