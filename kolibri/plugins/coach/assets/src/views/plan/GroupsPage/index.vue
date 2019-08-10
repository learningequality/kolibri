<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <PlanHeader />
      <div class="ta-r">
        <KButton
          class="new-group-button"
          :text="$tr('newGroupAction')"
          :primary="true"
          @click="openCreateGroupModal"
        />
      </div>

      <CoreTable>
        <thead slot="thead">
          <tr>
            <th>
              {{ coachString('nameLabel') }}
            </th>
            <th>
              {{ coreString('learnersLabel') }}
            </th>
            <th></th>
          </tr>

        </thead>
        <tbody slot="tbody">
          <GroupRowTr
            v-for="group in sortedGroups"
            :key="group.id"
            :group="group"
            @rename="openRenameGroupModal"
            @delete="openDeleteGroupModal"
          />
        </tbody>
      </CoreTable>

      <p v-if="!sortedGroups.length">
        {{ $tr('noGroups') }}
      </p>

      <CreateGroupModal
        v-if="showCreateGroupModal"
        :groups="sortedGroups"
        @submit="handleSuccessCreateGroup"
        @cancel="closeModal"
      />

      <RenameGroupModal
        v-if="showRenameGroupModal"
        :groupName="selectedGroup.name"
        :groupId="selectedGroup.id"
        :groups="sortedGroups"
        @cancel="closeModal"
      />

      <DeleteGroupModal
        v-if="showDeleteGroupModal"
        :groupName="selectedGroup.name"
        :groupId="selectedGroup.id"
        @submit="handleSuccessDeleteGroup"
        @cancel="closeModal"
      />

    </KPageContainer>
  </CoreBase>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import orderBy from 'lodash/orderBy';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';
  import PlanHeader from '../../plan/PlanHeader';
  import { GroupModals } from '../../../constants';
  import CreateGroupModal from './CreateGroupModal';
  import GroupRowTr from './GroupRow';
  import RenameGroupModal from './RenameGroupModal';
  import DeleteGroupModal from './DeleteGroupModal';

  export default {
    name: 'GroupsPage',
    components: {
      CoreTable,
      PlanHeader,
      GroupRowTr,
      CreateGroupModal,
      RenameGroupModal,
      DeleteGroupModal,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        selectedGroup: {
          name: '',
          id: '',
        },
      };
    },
    computed: {
      ...mapState('groups', ['groupModalShown', 'groups']),
      showCreateGroupModal() {
        return this.groupModalShown === GroupModals.CREATE_GROUP;
      },
      showRenameGroupModal() {
        return this.groupModalShown === GroupModals.RENAME_GROUP;
      },
      showDeleteGroupModal() {
        return this.groupModalShown === GroupModals.DELETE_GROUP;
      },
      sortedGroups() {
        return orderBy(this.groups, [group => group.name.toUpperCase()], ['asc']);
      },
    },
    methods: {
      ...mapActions('groups', ['displayModal']),
      ...mapActions(['createSnackbar']),
      closeModal() {
        this.displayModal(false);
      },
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
      handleSuccessCreateGroup() {
        this.createSnackbar(this.coachString('createdNotification'));
        this.displayModal(false);
      },
      handleSuccessDeleteGroup() {
        this.createSnackbar(this.coachString('deletedNotification'));
        this.displayModal(false);
      },
    },
    $trs: {
      newGroupAction: 'New group',
      noGroups: 'You do not have any groups',
    },
  };

</script>


<style lang="scss" scoped>

  .ta-r {
    text-align: right;
  }

</style>
