<template>

  <CoachAppBarPage>
    <KPageContainer>
      <p>
        <BackLink
          :to="$router.getRoute('GroupsPage')"
          :text="$tr('back')"
        />
      </p>

      <div v-if="!currentGroup">
        {{ $tr('groupDoesNotExist') }}
      </div>

      <div v-else>
        <h1>
          <KLabeledIcon
            icon="group"
            :label="currentGroup.name"
          />
        </h1>

        <KFixedGrid numCols="2">
          <KFixedGridItem span="1">
            <KIcon
              icon="classes"
              class="class-name-icon"
            />
            <span>{{ className }}</span>
          </KFixedGridItem>
          <KFixedGridItem
            span="1"
            alignment="right"
          >
            <KRouterLink
              :primary="true"
              appearance="raised-button"
              :text="$tr('enrollButton')"
              :to="$router.getRoute('GroupEnrollPage')"
            />

            <KIconButton
              icon="optionsHorizontal"
              style="margin-left: 1em"
            >
              <template #menu>
                <KDropdownMenu
                  position="bottom left"
                  :options="menuOptions"
                  @select="handleOptionSelect"
                />
              </template>
            </KIconButton>
          </KFixedGridItem>
        </KFixedGrid>

        <CoreTable>
          <template #headers>
            <th>{{ coreString('fullNameLabel') }}</th>
            <th>{{ coreString('usernameLabel') }}</th>
            <th></th>
          </template>

          <template #tbody>
            <tbody>
              <p v-if="currentGroup.users.length === 0">
                {{ coachString('learnerListEmptyState') }}
              </p>
              <tr
                v-for="user in currentGroup.users"
                :key="user.id"
              >
                <td>
                  <KLabeledIcon
                    icon="person"
                    :label="user.full_name"
                  />
                </td>
                <td>
                  {{ user.username }}
                </td>
                <td class="core-table-button-col">
                  <KButton
                    :text="coreString('removeAction')"
                    appearance="flat-button"
                    @click="userForRemoval = user"
                  />
                </td>
              </tr>
            </tbody>
          </template>
        </CoreTable>
        <RemoveFromGroupModal
          v-if="userForRemoval"
          :groupName="currentGroup.name"
          :username="userForRemoval.full_name"
          @cancel="userForRemoval = null"
          @submit="removeSelectedUserFromGroup"
        />
      </div>
    </KPageContainer>
    <RenameGroupModal
      v-if="showRenameGroupModal"
      :groupName="currentGroup.name"
      :groupId="currentGroup.id"
      :groups="groups"
      @cancel="closeModal"
    />

    <DeleteGroupModal
      v-if="showDeleteGroupModal"
      :groupName="currentGroup.name"
      :groupId="currentGroup.id"
      @submit="handleSuccessDeleteGroup"
      @cancel="closeModal"
    />
  </CoachAppBarPage>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';
  import { GroupModals } from '../../../constants';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import RenameGroupModal from '../GroupsPage/RenameGroupModal';
  import DeleteGroupModal from '../GroupsPage/DeleteGroupModal';
  import RemoveFromGroupModal from './RemoveFromGroupModal';

  export default {
    name: 'GroupMembersPage',
    components: {
      CoachAppBarPage,
      CoreTable,
      RemoveFromGroupModal,
      RenameGroupModal,
      DeleteGroupModal,
    },
    mixins: [commonCoreStrings, commonCoach],
    data() {
      return {
        userForRemoval: null,
      };
    },
    computed: {
      ...mapState('groups', ['groupModalShown', 'groups']),
      currentGroup() {
        return this.groups.find(g => g.id === this.$route.params.groupId);
      },
      menuOptions() {
        return [this.coachString('renameGroupAction'), this.$tr('deleteGroup')];
      },
      showRenameGroupModal() {
        return this.groupModalShown === GroupModals.RENAME_GROUP;
      },
      showDeleteGroupModal() {
        return this.groupModalShown === GroupModals.DELETE_GROUP;
      },
    },
    methods: {
      ...mapActions('groups', ['removeUsersFromGroup', 'displayModal']),
      removeSelectedUserFromGroup() {
        if (this.userForRemoval) {
          this.removeUsersFromGroup({
            userIds: [this.userForRemoval.id],
            groupId: this.currentGroup.id,
          }).then(() => {
            this.showSnackbarNotification('learnersRemovedNoCount', { count: 1 });
            this.userForRemoval = null;
          });
        }
      },
      closeModal() {
        this.displayModal(false);
      },
      handleSuccessDeleteGroup() {
        this.showSnackbarNotification('groupDeleted');
        this.displayModal(false);
        this.$router.push(this.$router.getRoute('GroupsPage'));
      },
      handleOptionSelect(value) {
        switch (value) {
          case this.coachString('renameGroupAction'):
            this.openRenameGroupModal(this.currentGroup.name, this.currentGroup.id);
            break;
          case this.$tr('deleteGroup'):
            this.openDeleteGroupModal(this.currentGroup.name, this.currentGroup.id);
            break;
          default:
            break;
        }
      },
      openRenameGroupModal() {
        this.displayModal(GroupModals.RENAME_GROUP);
      },
      openDeleteGroupModal() {
        this.displayModal(GroupModals.DELETE_GROUP);
      },
    },
    $trs: {
      enrollButton: {
        message: 'Enroll learners',
        context:
          'Button which allows user to add learners to a group once the group has been created.',
      },
      deleteGroup: {
        message: 'Delete group',
        context: 'Button allowing user to delete the group',
      },
      groupDoesNotExist: {
        message: 'This group does not exist',
        context: 'This message displays if a group no longer exists.',
      },
      back: {
        message: 'All groups',
        context: 'Link that takes the user back to the see all the group in the class.',
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

</style>
