<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    :immersivePagePrimary="true"
    :primary="true"
    :toolbarTitle="$tr('groupsHeader')"
    :appBarTitle="$tr('groupsHeader')"
    :immersivePageRoute="$router.getRoute('GroupsPage')"
  >
    <div v-if="!currentGroup">
      {{ $tr('groupDoesNotExist') }}
    </div>

    <div v-else class="new-coach-block">
      <h1>
        {{ currentGroup.name }}
      </h1>

      <KGrid>
        <KGridItem
          class="number-learners"
          :size="50"
          percentage
        >
          {{ $tr('numberOfLearners', { count: currentGroup.users.length }) }}
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

      <p v-if="removalError">
        {{ $tr('problemRemoving') }}
      </p>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <th class="core-table-main-col">
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
            <td class="core-table-main-col">
              {{ user.full_name }}
            </td>
            <td>
              {{ user.username }}
            </td>
            <td class="button-col">
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
        @confirm="removeSelectedUserFromGroup"
      />
    </div>
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
        const { users, name } = this.currentGroup;
        title = this.$tr('pageTitle', { groupName: name, count: users.length });
      }
      return {
        title,
      };
    },
    components: {
      CoreTable,
      RemoveFromGroupModal,
    },
    mixins: [commonCoach],
    props: {},
    data() {
      return {
        userForRemoval: null,
        removalError: false,
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
          })
            .then(() => {
              this.userForRemoval = null;
              this.removalError = false;
            })
            .catch(() => {
              this.removalError = true;
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
      numberOfLearners: '{ count, number } {count, plural, one {learner} other {learners}}',
      pageTitle:
        '{ groupName } - { count, number } {count, plural, one {learner} other {learners}}',
      problemRemoving: 'There was a problem removing this user',
    },
  };

</script>


<style lang="scss" scoped>

  .button-col {
    text-align: right;
  }

</style>
