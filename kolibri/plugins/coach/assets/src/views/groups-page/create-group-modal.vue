<template>

  <k-modal
    :title="$tr('newLearnerGroup')"
    size="small"
    :submitText="$tr('save')"
    :cancelText="$tr('cancel')"
    :submitDisabled="submitting"
    @submit="callCreateGroup"
    @cancel="close"
  >
    <k-textbox
      ref="name"
      type="text"
      :label="$tr('learnerGroupName')"
      :autofocus="true"
      :invalid="nameIsInvalid"
      :invalidText="nameIsInvalidText"
      :maxlength="50"
      @blur="nameBlurred = true"
      v-model.trim="name"
    />
  </k-modal>

</template>


<script>

  import { mapActions } from 'vuex';
  import kModal from 'kolibri.coreVue.components.kModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';

  export default {
    name: 'createGroupModal',
    $trs: {
      newLearnerGroup: 'Add new group',
      learnerGroupName: 'Group name',
      cancel: 'Cancel',
      save: 'Save',
      duplicateName: 'A group with that name already exists',
      required: 'This field is required',
    },
    components: {
      kModal,
      kTextbox,
    },
    props: {
      groups: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        name: '',
        nameBlurred: false,
        formSubmitted: false,
        submitting: false,
      };
    },
    computed: {
      duplicateName() {
        const index = this.groups.findIndex(
          group => group.name.toUpperCase() === this.name.toUpperCase()
        );
        if (index === -1) {
          return false;
        }
        return true;
      },
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.name === '') {
            return this.$tr('required');
          }
          if (this.duplicateName) {
            return this.$tr('duplicateName');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return Boolean(this.nameIsInvalidText);
      },
      formIsValid() {
        return !this.nameIsInvalid;
      },
    },
    methods: {
      ...mapActions(['displayModal', 'createGroup']),
      callCreateGroup() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.submitting = true;
          this.createGroup(this.name);
        } else {
          this.$refs.name.focus();
        }
      },
      close() {
        this.displayModal(false);
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
