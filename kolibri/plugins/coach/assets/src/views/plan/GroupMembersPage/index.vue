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
          <KLabeledIcon icon="group" :label="currentGroup.name" />
        </h1>

        <KFixedGrid numCols="2">
          <KFixedGridItem span="1" class="number-learners">
            {{ coachString('numberOfLearners', { value: currentGroup.users.length }) }}
          </KFixedGridItem>
          <KFixedGridItem span="1" alignment="right">
            <KRouterLink
              :primary="true"
              appearance="raised-button"
              :text="$tr('enrollButton')"
              :to="$router.getRoute('GroupEnrollPage')"
            />
          </KFixedGridItem>
        </KFixedGrid>

        <CoreTable>
          <thead slot="thead">
            <tr>
              <th>
                {{ coreString('fullNameLabel') }}
              </th>
              <th>
                {{ coreString('usernameLabel') }}
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
                <KLabeledIcon icon="person" :label="user.full_name" />
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
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
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
      ...mapActions(['createSnackbar']),
      removeSelectedUserFromGroup() {
        if (this.userForRemoval) {
          this.removeUsersFromGroup({
            userIds: [this.userForRemoval.id],
            groupId: this.currentGroup.id,
          }).then(() => {
            this.createSnackbar(this.coachString('updatedNotification'));
            this.userForRemoval = null;
          });
        }
      },
    },
    $trs: {
      enrollButton: 'Enroll learners',
      noLearnersInGroup: 'No learners in this group',
      groupDoesNotExist: 'This group does not exist',
      back: 'All groups',
    },
  };

</script>


<style lang="scss" scoped></style>
