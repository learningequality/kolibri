<template>

  <KModal
    :title="$tr('newLearnerGroup')"
    size="small"
    :submitText="$tr('save')"
    :cancelText="$tr('cancel')"
    :submitDisabled="submitting"
    @submit="callCreateGroup"
  >
    <KTextbox
      ref="name"
      v-model.trim="name"
      type="text"
      :label="$tr('learnerGroupName')"
      :autofocus="true"
      :invalid="nameIsInvalid"
      :invalidText="nameIsInvalidText"
      :maxlength="50"
      @blur="nameBlurred = true"
    />
  </KModal>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';

  export default {
    name: 'CreateGroupModal',
    components: {
      KModal,
      KTextbox,
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
      ...mapState('classSummary', { classId: 'id' }),
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
        if (this.submitting) return '';
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
      ...mapActions('groups', ['createGroup']),
      callCreateGroup() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.submitting = true;
          this.createGroup({ groupName: this.name, classId: this.classId }).then(() => {
            this.$emit('submit');
          });
        } else {
          this.$refs.name.focus();
        }
      },
    },
    $trs: {
      newLearnerGroup: 'Create new group',
      learnerGroupName: 'Group name',
      cancel: 'Cancel',
      save: 'Save',
      duplicateName: 'A group with that name already exists',
      required: 'This field is required',
    },
  };

</script>


<style lang="scss" scoped></style>
