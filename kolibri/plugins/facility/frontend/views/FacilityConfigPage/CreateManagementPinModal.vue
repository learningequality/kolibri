<template>

  <KModal
    :title="$tr('title')"
    :submitText="coreString('saveAction')"
    :cancelText="coreString('cancelAction')"
    @submit="submit"
    @cancel="$emit('cancel')"
  >
    <div>
      <p>{{ $tr('newToSync') }}</p>
      <p>{{ coreString('setPin') }}</p>

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

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { mapActions } from 'vuex';

  export default {
    name: 'CreateManagementPinModal',
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
          this.pinError = this.coreString('noEmptyField');
          this.focus();
        } else {
          if (this.pinPattern.test(this.pin)) {
            this.pinError = '';
            this.setPin({ pin_code: this.pin });
            this.showSnackbarNotification('pinCreated');
            this.$emit('submit');
          } else {
            this.pinError = this.coreString('numbersOnly');
            this.focus();
          }
        }
      },
      focus: function () {
        this.$refs.pinFocus.focus();
      },
    },
    $trs: {
      title: {
        message: 'Create device management PIN',
        context: 'Title for the create management modal.',
      },
      newToSync: {
        message:
          'You will need to sync this device with other devices with the same facility in order to use this PIN.',
        context: 'Reminder to sync devices',
      },
    },
  };

</script>
