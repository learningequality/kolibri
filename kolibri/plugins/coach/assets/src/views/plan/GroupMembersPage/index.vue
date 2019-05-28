<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

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
          <KLabeledIcon>
            <KIcon slot="icon" group />
            {{ currentGroup.name }}
          </KLabeledIcon>
        </h1>

        <KGrid>
          <KGridItem
            class="number-learners"
            :size="50"
            percentage
          >
            {{ common$tr('numberOfLearners', { value: currentGroup.users.length }) }}
          </KGridItem>
          <KGridItem :size="50" percentage alignment="right">
            <KRouterLink
              :primary="true"
              appearance="raised-button"
              :text="$tr('enrollButton')"
              :to="$router.getRoute('GroupEnrollPage')"
            />
          </KGridItem>
        </KGrid>

        <CoreTable>
          <thead slot="thead">
            <tr>
              <th>
                {{ $tr('fullName') }}
              </th>
              <th>
                {{ $tr('username') }}
              </th>
              <th></th>
            </tr>

          </thead>

          <tbody slot="tbody">
            <p v-if="currentGroup.users.length === 0">
              {{ $tr('noLearnersInGroup') }}
            </p>
            <tr
              v-for="user in currentGroup.users"
              :key="user.id"
            >
              <td>
                <KLabeledIcon>
                  <KIcon slot="icon" person />
                  {{ user.full_name }}
                </KLabeledIcon>
              </td>
              <td>
                {{ user.username }}
              </td>
              <td class="core-table-button-col">
                <KButton
                  :text="$tr('removeButton')"
                  appearance="flat-button"
                  @click="userForRemoval = user"
                />
              </td>
            </tr>
          </tbody>
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
  </CoreBase>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoach from '../../common';
  import RemoveFromGroupModal from './RemoveFromGroupModal';

  export default {
    name: 'GroupMembersPage',
    metaInfo() {
      let title;
      if (this.currentGroup) {
        const { name } = this.currentGroup;
        title = name;
      } else {
        title = '';
      }
      return {
        title: title,
      };
    },
    components: {
      CoreTable,
      RemoveFromGroupModal,
    },
    mixins: [commonCoach],
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
      ...mapActions(['createSnackbar']),
      removeSelectedUserFromGroup() {
        if (this.userForRemoval) {
          this.removeUsersFromGroup({
            userIds: [this.userForRemoval.id],
            groupId: this.currentGroup.id,
          }).then(() => {
            this.createSnackbar(this.common$tr('updatedNotification'));
            this.userForRemoval = null;
          });
        }
      },
    },
    $trs: {
      groupsHeader: 'Groups',
      enrollButton: 'Enroll learners',
      fullName: 'Full name',
      username: 'Username',
      removeButton: 'Remove',
      noLearnersInGroup: 'No learners in this group',
      groupDoesNotExist: 'This group does not exist',
      back: 'All groups',
    },
  };

</script>


<style lang="scss" scoped></style>
