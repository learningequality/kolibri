<template>

  <core-modal :title="$tr('deleteLearnerGroup')"
    @cancel="close">
    <p v-html="$trHtml('areYouSure', { groupName: groupName })"></p>
    <p>{{ $tr('learnersWillBecome') }} <strong>{{ $tr('ungrouped') }}</strong>.</p>
    <icon-button :text="$tr('cancel')"
      @click="close" />
    <icon-button :text="$tr('deleteGroup')"
      :primary="true"
      @click="deleteGroup(groupId)" />
  </core-modal>

</template>


<script>

  import * as groupActions from '../../state/actions/group';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import textbox from 'kolibri.coreVue.components.textbox';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  export default {
    $trNameSpace: 'deleteGroupModal',
    $trs: {
      deleteLearnerGroup: 'Delete Learner Group',
      areYouSure: 'Are you sure you want to delete <strong>{ groupName }</strong>?',
      learnersWillBecome: 'Learners within this group will become',
      ungrouped: 'Ungrouped',
      cancel: 'Cancel',
      deleteGroup: 'Delete Group',
    },
    components: {
      coreModal,
      textbox,
      iconButton,
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
    },
    methods: {
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal: groupActions.displayModal,
        deleteGroup: groupActions.deleteGroup,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
