<template>

  <div>
    <h1>{{ className }} - {{ $tr('groups') }}</h1>
    <div class="btn">
      <icon-button
        :text="$tr('newGroup')"
        :primary="true"
        @click="openCreateGroupModal"
      >
        <mat-svg category="content" name="add" />
      </icon-button>
    </div>

    <create-group-modal v-if="showCreateGroupModal"
      :classId="classId" />

    <rename-group-modal v-if="showRenameGroupModal"
      :classId="classId"
      :groupName="selectedGroup.name"
      :groupId="selectedGroup.id" />

    <delete-group-modal v-if="showDeleteGroupModal"
      :classId="classId"
      :groupName="selectedGroup.name"
      :groupId="selectedGroup.id" />

    <move-learners-modal v-if="showMoveLearnersModal"
      :groupId="selectedGroup.id"
      :groups="groups"
      :usersToMove="usersToMove"
      :isUngrouped="isUngrouped" />

    <group-section
      v-for="group in groups"
      :canMove="Boolean(groups.length)"
      :group="group"
      @rename="openRenameGroupModal"
      @delete="openDeleteGroupModal"
      @move="openMoveLearnersModal" />

    <group-section
      :canMove="Boolean(groups.length)"
      :group="ungroupedUsersObject"
      :isUngrouped="true"
      @move="openMoveLearnersModal" />
  </div>

</template>


<script>

  const groupActions = require('../../state/actions/group');
  const GroupModals = require('../../constants').GroupModals;
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
      'move-learners-modal': require('./move-learners-modal'),
    },
    data() {
      return {
        selectedGroup: { name: '', id: '' },
        usersToMove: [],
        isUngrouped: false,
      };
    },
    computed: {
      showCreateGroupModal() {
        return this.groupModalShown === GroupModals.CREATE_GROUP;
      },
      showRenameGroupModal() {
        return this.groupModalShown === GroupModals.RENAME_GROUP;
      },
      showDeleteGroupModal() {
        return this.groupModalShown === GroupModals.DELETE_GROUP;
      },
      showMoveLearnersModal() {
        return this.groupModalShown === GroupModals.MOVE_LEARNERS;
      },
      groupedUsers() {
        const groupedUsers = [];
        this.groups.forEach(group => {
          group.users.forEach(user => {
            groupedUsers.push(user);
          });
        });
        return groupedUsers;
      },
      ungroupedUsers() {
        return differenceWith(this.classUsers, this.groupedUsers, (a, b) => a.id === b.id);
      },
      ungroupedUsersObject() {
        return { name: this.$tr('ungrouped'), users: this.ungroupedUsers };
      },
    },
    methods: {
      openCreateGroupModal() {
        this.displayModal(GroupModals.CREATE_GROUP);
      },
      openRenameGroupModal(groupName, groupId) {
        this.selectedGroup = { name: groupName, id: groupId };
        this.displayModal(GroupModals.RENAME_GROUP);
      },
      openDeleteGroupModal(groupName, groupId) {
        this.selectedGroup = { name: groupName, id: groupId };
        this.displayModal(GroupModals.DELETE_GROUP);
      },
      openMoveLearnersModal(groupName, groupId, usersToMove, isUngrouped) {
        this.selectedGroup = { name: groupName, id: groupId };
        this.usersToMove = usersToMove;
        this.isUngrouped = isUngrouped;
        this.displayModal(GroupModals.MOVE_LEARNERS);
      },
    },
    vuex: {
      getters: {
        className: state => state.pageState.class.name,
        classId: state => state.pageState.class.id,
        classUsers: state => state.pageState.classUsers,
        groups: state => state.pageState.groups,
        groupModalShown: state => state.pageState.groupModalShown,
      },
      actions: {
        displayModal: groupActions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .btn
    text-align: right

</style>
