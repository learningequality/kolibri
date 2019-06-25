<template>

  <KModal
    :title="$tr('header')"
    :submitText="$tr('submitButtonLabel')"
    :cancelText="coreCommon$tr('cancelAction')"
    size="medium"
    :submitDisabled="attemptingToConnect"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('addressDesc') }}</p>
    <div>
      <KTextbox
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
        :invalidText="coreCommon$tr('requiredFieldLabel')"
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

  import KModal from 'kolibri.coreVue.components.KModal';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import { coreStringsMixin } from 'kolibri.coreVue.mixins.coreStringsMixin';
  import UiAlert from 'keen-ui/src/UiAlert';
  import { createAddress } from './api';

  const Statuses = {
    COULD_NOT_CONNECT: 'COULD_NOT_CONNECT',
    INVALID_ADDRESS: 'INVALID_ADDRESS',
  };

  export default {
    name: 'AddAddressForm',
    components: {
      KModal,
      KTextbox,
      UiAlert,
    },
    mixins: [coreStringsMixin],
    props: {},
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
          return this.coreCommon$tr('requiredFieldLabel');
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
        return createAddress({
          base_url: this.address,
          device_name: this.name,
        })
          .then(() => {
            this.$emit('added_address');
          })
          .catch(err => {
            const errorsCaught = CatchErrors(err, [
              ERROR_CONSTANTS.NETWORK_LOCATION_NOT_FOUND,
              ERROR_CONSTANTS.INVALID_NETWORK_LOCATION_FORMAT,
            ]);
            if (errorsCaught.includes(ERROR_CONSTANTS.NETWORK_LOCATION_NOT_FOUND)) {
              this.status = Statuses.COULD_NOT_CONNECT;
            } else if (errorsCaught.includes(ERROR_CONSTANTS.INVALID_NETWORK_LOCATION_FORMAT)) {
              this.status = Statuses.INVALID_ADDRESS;
            } else {
              this.$store.dispatch('handleApiError', err);
            }
          })
          .then(() => {
            this.attemptingToConnect = false;
          });
      },
    },
    $trs: {
      addressDesc:
        "The network address can be an IP and port like '192.168.0.100:8080' or a URL like 'example.com':",
      addressLabel: 'Full network address',
      addressPlaceholder: 'e.g. 192.168.0.100:8080',
      errorCouldNotConnect: 'Could not connect to this network address',
      errorInvalidAddress: 'Please enter a valid IP address, URL, or hostname',
      header: 'New address',
      nameDesc: 'Choose a name for this address so you can remember it later:',
      nameLabel: 'Network name',
      namePlaceholder: 'e.g. House network',
      submitButtonLabel: 'Add',
      tryingToConnect: 'Trying to connect to server…',
    },
  };

</script>


<style lang="scss" scoped></style>
