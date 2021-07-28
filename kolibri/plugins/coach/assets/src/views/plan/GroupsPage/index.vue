<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <template #sub-nav>
      <TopNavbar />
    </template>

    <KPageContainer>
      <PlanHeader />
      <div class="ta-r">
        <KButton
          :text="$tr('newGroupAction')"
          :primary="true"
          @click="openCreateGroupModal"
        />
      </div>

      <CoreTable>
        <template #headers>
          <th>{{ coachString('nameLabel') }}</th>
          <th>{{ coreString('learnersLabel') }}</th>
          <th></th>
        </template>
        <template #tbody>
          <tbody>
            <GroupRowTr
              v-for="group in sortedGroups"
              :key="group.id"
              :group="group"
              @rename="openRenameGroupModal"
              @delete="openDeleteGroupModal"
            />
          </tbody>
        </template>
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

  import { ref } from 'kolibri.lib.vueCompositionApi';
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
    setup() {
      const selectedGroup = ref({
        name: '',
        id: '',
      });

      return {
        selectedGroup,
        setSelectedGroup(name, id) {
          selectedGroup.value = { name, id };
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
      closeModal() {
        this.displayModal(false);
      },
      openCreateGroupModal() {
        this.displayModal(GroupModals.CREATE_GROUP);
      },
      openRenameGroupModal(groupName, groupId) {
        this.setSelectedGroup(groupName, groupId);
        this.displayModal(GroupModals.RENAME_GROUP);
      },
      openDeleteGroupModal(groupName, groupId) {
        this.setSelectedGroup(groupName, groupId);
        this.displayModal(GroupModals.DELETE_GROUP);
      },
      handleSuccessCreateGroup() {
        this.showSnackbarNotification('groupCreated');
        this.displayModal(false);
      },
      handleSuccessDeleteGroup() {
        this.showSnackbarNotification('groupDeleted');
        this.displayModal(false);
      },
    },
    $trs: {
      newGroupAction: {
        message: 'New group',
        context: 'Button used to create a new group of learners. ',
      },
      noGroups: {
        message: 'You do not have any groups',
        context: 'Message displayed when there are no groups within a class.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .ta-r {
    text-align: right;
  }

</style>
