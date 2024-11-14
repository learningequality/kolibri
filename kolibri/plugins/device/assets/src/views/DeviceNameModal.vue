<template>

  <KModal
    :title="coreString('deviceNameLabel')"
    :submitText="coreString('saveAction')"
    :cancelText="coreString('cancelAction')"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p>
      {{ $tr('deviceNameExplanation') }}
    </p>
    <KTextbox
      ref="name"
      v-model.trim="name"
      type="text"
      :label="coreString('deviceNameLabel')"
      :autofocus="true"
      :invalid="nameIsInvalid"
      :invalidText="nameIsInvalidText"
      :maxlength="50"
      @blur="nameBlurred = true"
    />
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'DeviceNameModal',
    mixins: [commonCoreStrings],
    props: {
      deviceName: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        name: this.deviceName,
        nameBlurred: false,
        formSubmitted: false,
      };
    },
    computed: {
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.name === '') {
            return this.coreString('requiredFieldError');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return Boolean(this.nameIsInvalidText);
      },
    },
    methods: {
      handleSubmit() {
        this.formSubmitted = true;
        if (this.nameIsInvalid) {
          this.$refs.name.focus();
        } else {
          this.$emit('submit', this.name);
        }
      },
    },
    $trs: {
      deviceNameExplanation: {
        message:
          'Give a unique and meaningful name to this device so you and others in your network can easily recognize it',

        context: 'Explanation of what the device name is',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
