<template>

  <CoachAppBarPage
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
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
          <KFixedGridItem
            span="1"
            class="number-learners"
          >
            {{ coachString('numberOfLearners', { value: currentGroup.users.length }) }}
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
  </CoachAppBarPage>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import RemoveFromGroupModal from './RemoveFromGroupModal';

  export default {
    name: 'GroupMembersPage',
    components: {
      CoachAppBarPage,
      CoreTable,
      RemoveFromGroupModal,
    },
    mixins: [commonCoreStrings, commonCoach],
    data() {
      return {
        userForRemoval: null,
      };
    },
    computed: {
      ...mapState('groups', ['groups']),
      currentGroup() {
        return this.groups.find(g => g.id === this.$route.params.groupId);
      },
    },
    methods: {
      ...mapActions('groups', ['removeUsersFromGroup']),
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
    },
    $trs: {
      enrollButton: {
        message: 'Enroll learners',
        context:
          'Button which allows user to add learners to a group once the group has been created.',
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


<style lang="scss" scoped></style>
