<template>

  <KModal
    :title="$tr('title')"
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
      :invalid="true"
      :invalidText="pinError"
      :showInvalidText="showErrorText"
    />
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
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
    methods: {
      ...mapActions('facilityConfig', ['isPinValid']),
      submit() {
        if (!this.pin.match(/^\d+$/)) {
          this.pinError = 'Please enter a 4-digit number';
          this.showErrorText = true;
          this.focus();
        } else {
          this.pinError = '';
          this.showErrorText = false;
          this.isPinValid(this.store, { pin_code: this.pin })
            .then(() => {
              this.pinError = '';
              this.showErrorText = false;
              this.$emit('submit');
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
      title: {
        message: 'Enter PIN',
        context: 'Title for the pin modal.',
      },
      pinPlaceholder: {
        message: 'PIN',
        context: 'Placeholder label for a PIN input',
      },
    },
  };

</script>
