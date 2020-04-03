<template>

  <KModal
    :title="$tr('title')"
    :submitText="coreString('saveAction')"
    :cancelText="coreString('cancelAction')"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <div>
      <p>{{ $tr('renameFacilityExplanation') }}</p>
      <KTextbox
        ref="name"
        v-model.trim="name"
        type="text"
        :label="coreString('facilityName')"
        :autofocus="true"
        :invalid="nameIsInvalid"
        :invalidText="nameIsInvalidText"
        :maxlength="50"
        @blur="nameBlurred = true"
      />
    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'EditFacilityNameModal',
    mixins: [commonCoreStrings],
    props: {
      facilityName: {
        type: String,
        required: false,
      },
    },
    data() {
      return {
        name: this.facilityName,
        nameBlurred: false,
        formSubmitted: false,
        isDuplicated: false,
      };
    },
    computed: {
      nameIsInvalidText() {
        this.checkDuplicated();
        if (this.nameBlurred || this.formSubmitted) {
          if (this.name === '') {
            return this.coreString('requiredFieldError');
          }
          if (this.isDuplicated) return this.coreString('facilityDuplicated');
        }
        return '';
      },
      nameIsInvalid() {
        //facilityDuplicated
        return Boolean(this.nameIsInvalidText);
      },
    },
    methods: {
      checkDuplicated() {
        this.isDuplicated = true;
      },
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
      renameFacilityExplanation: {
        message:
          'Warning: This will remain the same facility, and the new name may be synced to other devices that are also linked to this facility',
        context: 'Explanation of what consequences renaming will have',
      },
      title: 'Rename facility',
    },
  };

</script>


<style lang="scss" scoped></style>
