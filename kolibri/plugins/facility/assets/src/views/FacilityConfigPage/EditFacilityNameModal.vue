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
        @input="handleInput"
      />
    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { mapState } from 'vuex';

  export default {
    name: 'EditFacilityNameModal',
    mixins: [commonCoreStrings],
    props: {
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
        if (this.name === '') {
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
          ({ name }) => name.toLowerCase() === value.toLowerCase()
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
          'Warning: This will remain the same facility, and the new name may be synced to other devices that are also linked to this facility',
        context: 'Explanation of what consequences renaming will have',
      },
      title: 'Rename facility',
    },
  };

</script>


<style lang="scss" scoped></style>
