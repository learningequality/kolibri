<template>

  <KModal
    :title="$tr('title')"
    :submitText="coreString('saveAction')"
    :cancelText="coreString('cancelAction')"
    @submit="submit"
    @cancel="$emit('cancel')"
  >
    <div>
      <p>{{ $tr('needToSync') }}</p>
      <p>{{ $tr('setPin') }}</p>

      <KTextbox
        ref="pinFocus"
        v-model="pin"
        input="number"
        :label="coreString('enterPinPlaceholder')"
        :maxlength="4"
        :invalid="true"
        :invalidText="pinError"
        :showInvalidText="showErrorText"
      />
    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { mapActions } from 'vuex';

  export default {
    name: 'ChangePinModal',
    mixins: [commonCoreStrings],
    data() {
      return {
        pin: '',
        pinPattern: /^[0-9]{4}$/,
        pinError: null,
        showErrorText: false,
      };
    },
    computed: {},
    methods: {
      ...mapActions('facilityConfig', ['setPin']),
      submit() {
        if (!this.pin) {
          this.showErrorText = true;
          this.pinError = 'This field cannot be empty';
          this.focus();
        } else {
          if (this.pinPattern.test(this.pin)) {
            this.pinError = '';
            this.setPin({ pin_code: this.pin });
            this.$emit('submit');
            this.showSnackbarNotification('pinUpdated');
          } else {
            this.pinError = 'Invalid PIN format. Please enter a 4-digit number.';
            this.focus();
          }
        }
      },
      focus: function() {
        this.$refs.pinFocus.focus();
      },
    },
    $trs: {
      title: {
        message: 'Change device management PIN',
        context: 'Title for the change PIN modal.',
      },
      needToSync: {
        message:
          'You will need to sync this device with other devices that share this facility in order to use this PIN.',
        context: 'Reminder to sync devices',
      },
      setPin: {
        message: 'Choose a 4-digit number to set as your new PIN',
        context: 'Label to allow user to choose numbers to set PIN',
      },
    },
  };

</script>
