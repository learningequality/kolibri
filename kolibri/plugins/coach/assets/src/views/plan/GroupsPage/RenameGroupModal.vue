<template>

  <KModal
    :title="$tr('renameLearnerGroup')"
    size="small"
    :submitText="coreString('saveAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="submitting"
    @submit="callRenameGroup"
    @cancel="$emit('cancel')"
  >
    <KTextbox
      ref="name"
      v-model.trim="name"
      type="text"
      :label="coachString('groupNameLabel')"
      :autofocus="true"
      :invalid="nameIsInvalid"
      :invalidText="nameIsInvalidText"
      :maxlength="50"
      @blur="nameBlurred = true"
    />
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'RenameGroupModal',
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      groupName: {
        type: String,
        required: true,
      },
      groupId: {
        type: String,
        required: true,
      },
      groups: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        name: this.groupName,
        nameBlurred: false,
        formSubmitted: false,
        submitting: false,
      };
    },
    computed: {
      duplicateName() {
        // if same name, different case
        if (this.name.toUpperCase() === this.groupName.toUpperCase()) {
          return false;
        }
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
            return this.coreString('requiredFieldError');
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
      ...mapActions('groups', ['renameGroup']),
      callRenameGroup() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.submitting = true;
          this.renameGroup({
            groupId: this.groupId,
            newGroupName: this.name,
          });
        } else {
          this.$refs.name.focus();
        }
      },
    },
    $trs: {
      renameLearnerGroup: 'Rename group',
      duplicateName: 'A group with that name already exists',
    },
  };

</script>


<style lang="scss" scoped></style>
