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
        v-model="name"
        type="text"
        :label="coreString('facilityName')"
        :autofocus="true"
        :invalid="nameIsInvalid"
        :invalidText="nameIsInvalidText"
        :maxlength="50"
        @blur="nameBlurred = true"
        @input="handleInput"
      />
    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { mapState } from 'vuex';

  export default {
    name: 'EditFacilityNameModal',
    mixins: [commonCoreStrings],
    props: {
      facilityId: {
        type: String,
        required: true,
      },
      facilityName: {
        type: String,
        required: true,
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
      ...mapState('facilityConfig', ['facilities']),
      nameIsInvalidText() {
        if (this.name.trim() === '') {
          return this.coreString('requiredFieldError');
        }
        if (this.isDuplicated) return this.coreString('facilityDuplicated');
        return '';
      },
      nameIsInvalid() {
        return Boolean(this.nameIsInvalidText);
      },
    },
    methods: {
      handleInput($event) {
        if (this.facilityName != $event) this.facilityNameIsUnique($event);
      },
      facilityNameIsUnique(value) {
        this.isDuplicated = !!this.facilities.find(
          facility =>
            facility.id != this.facilityId && facility.name.toLowerCase() === value.toLowerCase(),
        );
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
          'Warning: Only the facility name will be changed, and the new name will be synced and updated on other devices linked to this facility.',

        context: 'Explanation of what consequences renaming a facility will have.',
      },
      title: {
        message: 'Rename facility',
        context: 'Title of window where a user can rename a facility.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
