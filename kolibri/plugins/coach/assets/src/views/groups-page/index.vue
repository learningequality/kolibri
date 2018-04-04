<template>

  <div>
    <section>
      <h1 :class="{header: sortedGroups.length}">{{ $tr('classGroups') }}</h1>

      <span v-if="!sortedGroups.length">{{ $tr('noGroups') }}</span>

      <k-button
        class="new-group-button"
        :text="$tr('newGroup')"
        :primary="true"
        @click="openCreateGroupModal"
      />
    </section>

    <create-group-modal
      v-if="showCreateGroupModal"
      :groups="sortedGroups"
    />

    <rename-group-modal
      v-if="showRenameGroupModal"
      :groupName="selectedGroup.name"
      :groupId="selectedGroup.id"
      :groups="sortedGroups"
    />

    <delete-group-modal
      v-if="showDeleteGroupModal"
      :groupName="selectedGroup.name"
      :groupId="selectedGroup.id"
    />

    <move-learners-modal
      v-if="showMoveLearnersModal"
      :groupId="selectedGroup.id"
      :groups="sortedGroups"
      :usersToMove="usersToMove"
      :isUngrouped="isUngrouped"
    />

    <group-section
      v-for="group in sortedGroups"
      :key="group.id"
      :canMove="Boolean(sortedGroups.length)"
      :group="group"
      @rename="openRenameGroupModal"
      @delete="openDeleteGroupModal"
      @move="openMoveLearnersModal"
    />

    <group-section
      :canMove="Boolean(sortedGroups.length)"
      :group="ungroupedUsersObject"
      :isUngrouped="true"
      @move="openMoveLearnersModal"
    />
  </div>

</template>


<script>

  import differenceWith from 'lodash/differenceWith';
  import orderBy from 'lodash/orderBy';
  import flatMap from 'lodash/flatMap';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { GroupModals } from '../../constants';
  import { displayModal } from '../../state/actions/group';
  import createGroupModal from './create-group-modal';
  import groupSection from './group-section';
  import renameGroupModal from './rename-group-modal';
  import deleteGroupModal from './delete-group-modal';
  import moveLearnersModal from './move-learners-modal';

  export default {
    name: 'coachGroupsPage',
    $trs: {
      classGroups: 'Class groups',
      newGroup: 'New group',
      ungrouped: 'Ungrouped',
      noGroups: 'You do not have any groups',
    },
    components: {
      kButton,
      createGroupModal,
      groupSection,
      renameGroupModal,
      deleteGroupModal,
      moveLearnersModal,
    },
    data() {
      return {
        selectedGroup: {
          name: '',
          id: '',
        },
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
      sortedGroups() {
        return orderBy(this.groups, [group => group.name.toUpperCase()], ['asc']);
      },
      groupedUsers() {
        return flatMap(this.sortedGroups, 'users');
      },
      ungroupedUsers() {
        return differenceWith(this.classUsers, this.groupedUsers, (a, b) => a.id === b.id);
      },
      ungroupedUsersObject() {
        return {
          name: this.$tr('ungrouped'),
          users: this.ungroupedUsers,
        };
      },
    },
    methods: {
      openCreateGroupModal() {
        this.displayModal(GroupModals.CREATE_GROUP);
      },
      openRenameGroupModal(groupName, groupId) {
        this.selectedGroup = {
          name: groupName,
          id: groupId,
        };
        this.displayModal(GroupModals.RENAME_GROUP);
      },
      openDeleteGroupModal(groupName, groupId) {
        this.selectedGroup = {
          name: groupName,
          id: groupId,
        };
        this.displayModal(GroupModals.DELETE_GROUP);
      },
      openMoveLearnersModal(groupName, groupId, usersToMove, isUngrouped) {
        this.selectedGroup = {
          name: groupName,
          id: groupId,
        };
        this.usersToMove = usersToMove;
        this.isUngrouped = isUngrouped;
        this.displayModal(GroupModals.MOVE_LEARNERS);
      },
    },
    vuex: {
      getters: {
        classUsers: state => state.pageState.classUsers,
        groups: state => state.pageState.groups,
        groupModalShown: state => state.pageState.groupModalShown,
      },
      actions: { displayModal },
    },
  };

</script>


<style lang="stylus" scoped>

  .new-group-button
    float: right

  .header
    display: inline-block
    vertical-align: middle
    margin-right: 16px

</style>
