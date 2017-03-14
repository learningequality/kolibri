<template>

  <div>
    <h1>{{ $tr('groups') }} - {{ className }}</h1>
    <icon-button :text="$tr('newGroup')"
      :primary="true"
      @click="openCreateGroupModal">
      <mat-svg category="content"
        name="add" />
    </icon-button>

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

    <group-section v-for="group in groups"
      :group="group"
      :className="className"
      :classId="classId"
      @rename="openRenameGroupModal"
      @delete="openDeleteGroupModal" />

    <group-section :group="ungroupedUsersObject"
      :className="className"
      :classId="classId"
      :showMenu="false" />
  </div>

</template>


<script>

  const actions = require('../../actions');
  const constants = require('../../state/constants');
  const differenceWith = require('lodash.differencewith');

  module.exports = {
    $trNameSpace: 'coachGroupsPage',
    $trs: {
      groups: 'Groups',
      newGroup: 'New group',
      ungrouped: 'Ungrouped',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'create-group-modal': require('./create-group-modal'),
      'group-section': require('./group-section'),
      'rename-group-modal': require('./rename-group-modal'),
      'delete-group-modal': require('./delete-group-modal'),
    },
    data() {
      return {
        selectedGroup: { name: '', id: '' },
      };
    },
    computed: {
      showCreateGroupModal() {
        return this.modalShown === constants.Modals.CREATE_GROUP;
      },
      showRenameGroupModal() {
        return this.modalShown === constants.Modals.RENAME_GROUP;
      },
      showDeleteGroupModal() {
        return this.modalShown === constants.Modals.DELETE_GROUP;
      },
      groupedUsers() {
        const groupedUsers = [];
        this.groups.forEach(group => {
          groupedUsers.push(group.users);
        });
        return groupedUsers;
      },
      ungroupedUsers() {
        return differenceWith(this.classUsers, this.groupedUsers, (a, b) => a.id === b.id);
      },
      ungroupedUsersObject() {
        return { users: this.ungroupedUsers };
      },
    },
    methods: {
      openCreateGroupModal() {
        this.displayModal(constants.Modals.CREATE_GROUP);
      },
      openRenameGroupModal(groupName, groupId) {
        this.selectedGroup = { name: groupName, id: groupId };
        this.displayModal(constants.Modals.RENAME_GROUP);
      },
      openDeleteGroupModal(groupName, groupId) {
        this.selectedGroup = { name: groupName, id: groupId };
        this.displayModal(constants.Modals.DELETE_GROUP);
      },
    },
    vuex: {
      getters: {
        className: state => state.pageState.class.name,
        classId: state => state.pageState.class.id,
        classUsers: state => state.pageState.classUsers,
        groups: state => state.pageState.groups,
        modalShown: state => state.pageState.modalShown,
      },
      actions: {
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus"
  scoped></style>
