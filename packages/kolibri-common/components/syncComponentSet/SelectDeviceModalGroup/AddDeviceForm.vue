<template>

  <KModal
    :title="getCommonSyncString('newAddressTitle')"
    :submitText="$tr('submitButtonLabel')"
    :cancelText="coreString('cancelAction')"
    size="medium"
    :submitDisabled="attemptingToConnect"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('addressDesc') }}</p>
    <div>
      <KTextbox
        ref="address"
        v-model="address"
        :label="$tr('addressLabel')"
        :placeholder="$tr('addressPlaceholder')"
        :autofocus="true"
        :invalid="addressIsInvalid"
        :invalidText="addressInvalidText"
        :disabled="attemptingToConnect"
        @blur="addressBlurred = true"
      />
    </div>
    <p>{{ $tr('nameDesc') }}</p>
    <div>
      <KTextbox
        v-model="name"
        :label="$tr('nameLabel')"
        :placeholder="$tr('namePlaceholder')"
        :invalid="nameIsInvalid"
        :invalidText="coreString('requiredFieldError')"
        :maxlength="40"
        :disabled="attemptingToConnect"
        @blur="nameBlurred = true"
      />
    </div>

    <UiAlert
      v-if="attemptingToConnect"
      :dismissible="false"
    >
      {{ $tr('tryingToConnect') }}
    </UiAlert>
  </KModal>

</template>


<script>

  import CatchErrors from 'kolibri/utils/CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri/constants';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import { createDevice } from './api';

  const Statuses = {
    COULD_NOT_CONNECT: 'COULD_NOT_CONNECT',
    INVALID_ADDRESS: 'INVALID_ADDRESS',
  };

  export default {
    name: 'AddDeviceForm',
    components: {
      UiAlert,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    data() {
      return {
        address: '',
        addressBlurred: false,
        attemptingToConnect: false,
        name: '',
        nameBlurred: false,
        status: '',
      };
    },
    computed: {
      addressInvalidText() {
        if (this.status === Statuses.INVALID_ADDRESS) {
          return this.$tr('errorInvalidAddress');
        }
        if (this.status === Statuses.COULD_NOT_CONNECT) {
          return this.$tr('errorCouldNotConnect');
        }
        if (this.address === '') {
          return this.coreString('requiredFieldError');
        }
        return '';
      },
      addressIsInvalid() {
        return this.addressBlurred && this.addressInvalidText !== '';
      },
      nameIsInvalid() {
        return this.nameBlurred && this.name === '';
      },
      formIsInvalid() {
        return this.addressIsInvalid || this.nameIsInvalid;
      },
    },
    methods: {
      handleSubmit() {
        this.addressBlurred = true;
        this.nameBlurred = true;
        this.status = '';
        if (this.formIsInvalid) {
          return Promise.resolve();
        }
        this.attemptingToConnect = true;
        return createDevice({
          base_url: this.address,
          nickname: this.name,
        })
          .then(address => {
            this.$emit('added_address', address.id);
          })
          .catch(err => {
            const errorsCaught = CatchErrors(err, [
              ERROR_CONSTANTS.NETWORK_LOCATION_NOT_FOUND,
              ERROR_CONSTANTS.INVALID_NETWORK_LOCATION_FORMAT,
            ]);
            if (errorsCaught.includes(ERROR_CONSTANTS.NETWORK_LOCATION_NOT_FOUND)) {
              this.status = Statuses.COULD_NOT_CONNECT;
              this.$refs.address.focus();
            } else if (errorsCaught.includes(ERROR_CONSTANTS.INVALID_NETWORK_LOCATION_FORMAT)) {
              this.status = Statuses.INVALID_ADDRESS;
              this.$refs.address.focus();
            } else {
              this.$store.dispatch('handleApiError', { error: err });
            }
          })
          .then(() => {
            this.attemptingToConnect = false;
          });
      },
    },
    $trs: {
      addressDesc: {
        message:
          "The network address can be an IP and port like '192.168.0.100:8080' or a URL like 'example.com':",
        context:
          'This text appears as a helper for admins in the Device > Facilities section so they know what the format of the network address should be like.\n\nUsers can import resources from a different device running Kolibri in their same local network, or from a Kolibri server hosted outside their LAN, provided they know its exact IP address.',
      },
      addressLabel: {
        message: 'Full network address',
        context:
          'This is the field where an admin enters the network address of a different device running Kolibri. This can be either in their same local network, or from a Kolibri server hosted outside their LAN.\n\nThe admin adds this network address in the Device > Facilities section.',
      },
      addressPlaceholder: {
        message: 'e.g. 192.168.0.100:8080',
        context: 'Example of a network address.',
      },
      errorCouldNotConnect: {
        message: 'Could not connect to this device',
        context:
          "This is an error message that an admin will see when Kolibri can't connect to another device when trying to import resources.",
      },
      errorInvalidAddress: {
        message: 'Please enter a valid IP address, URL, or hostname',
        context:
          'This is an error validation message that an admin will see when they do not enter a valid network address.',
      },
      nameDesc: {
        message: 'Choose a name for this device so you can remember it later:',
        context:
          'When an admin adds a new device they can give it a name. This is a helper text to remind them to choose a name for the device.',
      },
      nameLabel: {
        message: 'Name',
        context: "This should be just 'Name', not 'Network name'",
      },
      namePlaceholder: {
        message: 'e.g. House network',
        context: 'Example of a network name.',
      },
      submitButtonLabel: {
        message: 'Add',
        context: 'Text for button used to add a new device.',
      },
      tryingToConnect: {
        message: 'Trying to connect to server…',
        context:
          'Progress message an admin sees when Kolibri is attempting to connect to a device.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
