<template>

  <KModal
    :title="$tr('title')"
    :submitText="$tr('save')"
    :cancelText="$tr('cancel')"
    @submit="submit"
    @cancel="$emit('cancel')"
  >
    <div>
      <p>{{ $tr('needToSync') }}</p>
      <p>{{ $tr('setPin') }}</p>

      <KTextbox
        ref="myfocus"
        v-model="pin"
        input="number"
        :label="$tr('enterPinLabel')"
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
      submit() {
        if (!this.pin) {
          this.showErrorText = true;
          this.pinError = 'This field cannot be empty';
          this.focus();
        } else {
          if (this.pinPattern.test(this.pin)) {
            this.pinError = '';
            this.$emit('submit');
          } else {
            this.pinError = 'Invalid PIN format. Please enter a 4-digit number.';
            this.focus();
          }
        }
        this.showSnackbarNotification('pinUpadeted');
      },
      focus: function() {
        this.$refs.myfocus.focus();
      },
    },
    $trs: {
      title: {
        message: 'Change device management PIN',
        context: 'Title for the change pin modal.',
      },
      needToSync: {
        message:
          'You will need to sync this device with other devices that share this facility in order to use this PIN.',
        context: 'Reminder to sync devices',
      },
      setPin: {
        message: 'Choose four numbers to set as your new PIN.',
        context: 'Label to allow user to choose numbers to set PIN',
      },
      cancel: {
        message: 'cancel',
        context: 'cancel btn text',
      },
      save: {
        message: 'save',
        context: 'Text for save button',
      },
      enterPinLabel: {
        message: 'Enter PIN',
        context: 'Enter PIN label',
      },
    },
  };

</script>
