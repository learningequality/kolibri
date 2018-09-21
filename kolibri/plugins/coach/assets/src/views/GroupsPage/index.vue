<template>

  <div>
    <KGrid>
      <KGridItem sizes="100, 50, 50" percentage>
        <h1>{{ $tr('classGroups') }}</h1>
        <p v-if="!sortedGroups.length">{{ $tr('noGroups') }}</p>
      </KGridItem>
      <KGridItem sizes="100, 50, 50" percentage alignment="right">
        <KButton
          class="new-group-button"
          :text="$tr('newGroup')"
          :primary="true"
          @click="openCreateGroupModal"
        />
      </KGridItem>
    </KGrid>

    <CreateGroupModal
      v-if="showCreateGroupModal"
      :groups="sortedGroups"
    />

    <RenameGroupModal
      v-if="showRenameGroupModal"
      :groupName="selectedGroup.name"
      :groupId="selectedGroup.id"
      :groups="sortedGroups"
    />

    <DeleteGroupModal
      v-if="showDeleteGroupModal"
      :groupName="selectedGroup.name"
      :groupId="selectedGroup.id"
    />

    <MoveLearnersModal
      v-if="showMoveLearnersModal"
      :groupId="selectedGroup.id"
      :groups="sortedGroups"
      :usersToMove="usersToMove"
      :isUngrouped="isUngrouped"
    />

    <GroupSection
      v-for="group in sortedGroups"
      :key="group.id"
      :canMove="Boolean(sortedGroups.length)"
      :group="group"
      @rename="openRenameGroupModal"
      @delete="openDeleteGroupModal"
      @move="openMoveLearnersModal"
    />

    <GroupSection
      :canMove="Boolean(sortedGroups.length)"
      :group="ungroupedUsersObject"
      :isUngrouped="true"
      @move="openMoveLearnersModal"
    />
  </div>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import differenceWith from 'lodash/differenceWith';
  import orderBy from 'lodash/orderBy';
  import flatMap from 'lodash/flatMap';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import { GroupModals } from '../../constants';
  import CreateGroupModal from './CreateGroupModal';
  import GroupSection from './GroupSection';
  import RenameGroupModal from './RenameGroupModal';
  import DeleteGroupModal from './DeleteGroupModal';
  import MoveLearnersModal from './MoveLearnersModal';

  export default {
    name: 'GroupsPage',
    $trs: {
      classGroups: 'Groups',
      newGroup: 'New group',
      ungrouped: 'Ungrouped',
      noGroups: 'You do not have any groups',
      documentTitle: 'Groups',
    },
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      KButton,
      KGrid,
      KGridItem,
      CreateGroupModal,
      GroupSection,
      RenameGroupModal,
      DeleteGroupModal,
      MoveLearnersModal,
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
      ...mapState('groups', ['classUsers', 'groupModalShown', 'groups']),
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
      ...mapActions('groups', ['displayModal']),
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
  };

</script>


<style lang="scss" scoped></style>
