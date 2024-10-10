<template>

  <CoachAppBarPage>
    <KPageContainer>
      <PlanHeader :activeTabId="PlanTabs.GROUPS">
        <template #header>
          <h1>{{ coachString('groupsLabel') }}</h1>
          <p>
            <KIcon
              icon="classes"
              class="class-name-icon"
            />
            <span>{{ className }}</span>
          </p>

          <p>
            {{ $tr('groupsDescription') }}
            <KButton
              appearance="basic-link"
              :text="coreString('learnMoreAction')"
              @click="openAboutGroupModal"
            />
          </p>
        </template>
      </PlanHeader>
      <KTabsPanel
        :tabsId="PLAN_TABS_ID"
        :activeTabId="PlanTabs.GROUPS"
      >
        <div class="ta-r">
          <KButton
            :text="$tr('newGroupAction')"
            :primary="true"
            @click="openCreateGroupModal"
          />
        </div>

        <CoreTable
          :dataLoading="groupsAreLoading"
          :emptyMessage="$tr('noGroups')"
        >
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
                @enroll="
                  () => $router.push($router.getRoute('GroupEnrollPage', { groupId: group.id }))
                "
              />
            </tbody>
          </template>
        </CoreTable>

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

        <KModal
          v-if="showAboutGroupModal"
          :title="$tr('aboutGroupsTitle')"
          @cancel="closeModal"
          @submit="closeModal"
        >
          <p style="overflow-y: visible">{{ $tr('aboutGroupsDescription') }}</p>
          <template #actions>
            <KButton @click="closeModal">
              {{ coreString('closeAction') }}
            </KButton>
          </template>
        </KModal>
      </KTabsPanel>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import { ref } from 'kolibri.lib.vueCompositionApi';
  import { mapState, mapActions } from 'vuex';
  import orderBy from 'lodash/orderBy';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';
  import { useGroups } from '../../../composables/useGroups';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import PlanHeader from '../../plan/PlanHeader';
  import { GroupModals } from '../../../constants';
  import { PLAN_TABS_ID, PlanTabs } from '../../../constants/tabsConstants';
  import CreateGroupModal from './CreateGroupModal';
  import GroupRowTr from './GroupRow';
  import RenameGroupModal from './RenameGroupModal';
  import DeleteGroupModal from './DeleteGroupModal';

  export default {
    name: 'GroupsPage',
    components: {
      CoachAppBarPage,
      CoreTable,
      PlanHeader,
      GroupRowTr,
      CreateGroupModal,
      RenameGroupModal,
      DeleteGroupModal,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { groupsAreLoading } = useGroups();
      const selectedGroup = ref({
        name: '',
        id: '',
      });

      return {
        PLAN_TABS_ID,
        PlanTabs,
        selectedGroup,
        setSelectedGroup(name, id) {
          selectedGroup.value = { name, id };
        },
        groupsAreLoading,
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
      showAboutGroupModal() {
        return this.groupModalShown === GroupModals.ABOUT_GROUP;
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
      openAboutGroupModal(groupName, groupId) {
        this.setSelectedGroup(groupName, groupId);
        this.displayModal(GroupModals.ABOUT_GROUP);
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
        context:
          "Button used to create a new group of learners. Located on the 'Plan your class' page for coaches.",
      },
      noGroups: {
        message: 'You do not have any groups',
        context: 'Message displayed when there are no groups within a class.',
      },
      groupsDescription: {
        message: 'Personalize learning by organizing learners into groups',
        context:
          'A brief statement describing the current page. This sentence is to be followed by a button labeled "Learn more" which will open an informative modal',
      },
      aboutGroupsTitle: {
        message: 'About groups',
        context: 'Title for a modal with information describing the groups feature',
      },
      aboutGroupsDescription: {
        message:
          'Groups help coaches personalize learning and support differentiated instruction. Organize learners into groups, assign tailored lessons and quizzes to each and monitor their progress.',
        context:
          'Shown to the coach when they click the "Learn more" button that follows the groups page description',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .class-name-icon {
    position: relative;
    // Aligns icon to class name text
    top: 0.34em;
    // Icon was far smaller than text by default, better matches
    width: 1.5em;
    height: 1.5em;
    // Space between icon and text
    margin-right: 0.5em;
  }

  .ta-r {
    text-align: right;
  }

</style>
