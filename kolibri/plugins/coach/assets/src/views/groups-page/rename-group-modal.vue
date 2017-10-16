<template>

  <core-modal :title="$tr('renameLearnerGroup')" @cancel="close">
    <div>
      <form @submit.prevent="callRenameGroup">
        <k-textbox
          ref="name"
          type="text"
          :label="$tr('learnerGroupName')"
          :autofocus="true"
          :invalid="nameIsInvalid"
          :invalidText="nameIsInvalidText"
          @blur="nameBlurred = true"
          v-model.trim="name"
        />
        <div class="ta-r">
          <k-button
            type="button"
            :text="$tr('cancel')"
            appearance="flat-button"
            @click="close"
          />
          <k-button
            type="submit"
            :text="$tr('save')"
            :primary="true"
            :disabled="submitting"
          />
        </div>
      </form>
    </div>
  </core-modal>

</template>


<script>

  import { renameGroup, displayModal } from '../../state/actions/group';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    name: 'renameGroupModal',
    $trs: {
      renameLearnerGroup: 'Rename Learner Group',
      learnerGroupName: 'Learner Group Name',
      cancel: 'Cancel',
      save: 'Save',
      duplicateName: 'A group with that name already exists',
      required: 'This field is required',
    },
    components: {
      coreModal,
      kTextbox,
      kButton,
    },
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
        if (this.name === this.groupName) {
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
            return this.$tr('required');
          }
          if (this.duplicateName) {
            return this.$tr('duplicateName');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return !!this.nameIsInvalidText;
      },
      formIsValid() {
        return !this.nameIsInvalid;
      },
    },
    methods: {
      callRenameGroup() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.submitting = true;
          this.renameGroup(this.groupId, this.name);
        } else {
          this.$refs.name.focus();
        }
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        renameGroup,
        displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .ta-r
    text-align: right

</style>
