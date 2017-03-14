<template>

  <div>
    <h1>{{ $tr('groups') }} - {{ className }}</h1>
    <icon-button :text="$tr('newGroup')"
      :primary="true"
      @click="openCreateGroupModal">
      <mat-svg category="content"
        name="add" />
    </icon-button>

    <div v-for="group in groups">
      <h2>{{ group.name }}</h2>
      <!--TODO: Fix this-->
      <span v-if="group.users">{{ $tr('numLearners', {count: group.users.length }) }}</span>
      <span v-else>{{ $tr('numLearners', {count: 0 }) }}</span>
      <!--0 selected-->
      <icon-button :text="$tr('moveLearners')"
        :primary="true"
        size="small"
        @click="moveUsers" />
      <ui-button color="primary"
        :has-dropdown="true"
        ref="groupDropdownButton"
        size="small">
        <group-options-menu slot="dropdown"
          :groupName="group.name"
          :groupId="group.id"
          :options="menuOptions"
          @selected="handleSelection"
          @close="closeGroupDropdowns"/>
      </ui-button>
    </div>

    <create-group-modal v-if="showCreateGroupModal"
      :className="className"
      :classId="classId" />

    <rename-group-modal v-if="showRenameGroupModal"
      :className="className"
      :classId="classId"
      :groupName="selectedGroup.name"
      :groupId="selectedGroup.id" />

    <delete-group-modal v-if="showDeleteGroupModal"
      :className="className"
      :classId="classId"
      :groupName="selectedGroup.name"
      :groupId="selectedGroup.id" />
  </div>

</template>


<script>

  const actions = require('../../actions');
  const constants = require('../../state/constants');


  module.exports = {
    $trNameSpace: 'coachGroupsPage',
    $trs: {
      groups: 'Groups',
      newGroup: 'New group',
      numLearners: '{count, number, integer} {count, plural, one {Learner} other {Learners}}',
      moveLearners: 'Move Learners',
      renameGroup: 'Rename Group',
      deleteGroup: 'Delete Group',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'create-group-modal': require('./create-group-modal'),
      'rename-group-modal': require('./rename-group-modal'),
      'delete-group-modal': require('./delete-group-modal'),
      'group-options-menu': require('./group-options-menu'),
      'ui-button': require('keen-ui/src/UiButton'),
    },
    data() {
      return {
        selectedGroup: { name: null, id: null },
      };
    },
    computed: {
      menuOptions() {
        return [{ label: this.$tr('renameGroup') }, { label: this.$tr('deleteGroup') }];
      },
      showCreateGroupModal() {
        return this.modalShown === constants.Modals.CREATE_GROUP;
      },
      showRenameGroupModal() {
        return this.modalShown === constants.Modals.RENAME_GROUP;
      },
      showDeleteGroupModal() {
        return this.modalShown === constants.Modals.DELETE_GROUP;
      },
    },
    methods: {
      openCreateGroupModal() {
        this.displayModal(constants.Modals.CREATE_GROUP);
      },
      openRenameGroupModal() {
        this.displayModal(constants.Modals.RENAME_GROUP);
      },
      openDeleteGroupModal() {
        this.displayModal(constants.Modals.DELETE_GROUP);
      },
      handleSelection(selectedOption, groupName, groupId) {
        this.selectedGroup = { name: groupName, id: groupId };
        switch (selectedOption) {
          case (this.$tr('renameGroup')):
            this.openRenameGroupModal();
            break;
          case (this.$tr('deleteGroup')):
            this.openDeleteGroupModal();
            break;
          default:
            break;
        }
      },
      moveUsers() {
        console.log('move users');
      },
      closeGroupDropdowns() {
        // lowkey ashamed
        this.$refs.groupDropdownButton.forEach((button) => {
          button.closeDropdown();
        });
      },
    },
    vuex: {
      getters: {
        className: state => state.pageState.class.name,
        classId: state => state.pageState.class.id,
        classUsers: state => state.pageState.classUsers,
        modalShown: state => state.pageState.modalShown,
        groups: state => state.pageState.groups,
      },
      actions: {
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus"
  scoped></style>
