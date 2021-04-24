<template>

  <KPageContainer>
    <KGrid>
      <KGridItem
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <h1>{{ coreString('usersLabel') }}</h1>
      </KGridItem>
      <KGridItem
        :layout="{ alignment: 'right' }"
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <KRouterLink
          :text="$tr('newUserButtonLabel')"
          :primary="true"
          appearance="raised-button"
          class="move-down"
          :to="$store.getters.facilityPageLinks.UserCreatePage"
        />
      </KGridItem>
    </KGrid>

    <PaginatedListContainer
      :items="usersFilteredByRow"
      :filterPlaceholder="$tr('searchText')"
    >
      <template #otherFilter>
        <KSelect
          v-model="roleFilter"
          :label="coreString('userTypeLabel')"
          :options="userKinds"
          :inline="true"
          class="type-filter"
        />
      </template>

      <template #default="{ items, filterInput }">
        <div>
          <CoreTable>
            <template #headers>
              <th>
                <!-- "Full name" header visually hidden if checkbox is on -->
                <span>
                  {{ coreString('fullNameLabel') }}
                </span>
              </th>
              <th>
                <span class="visuallyhidden">
                  {{ $tr('role') }}
                </span>
              </th>
              <th>{{ coreString('usernameLabel') }}</th>
              <template>
                <th>
                  <span>{{ coreString('identifierLabel') }}</span>
                  <CoreInfoIcon
                    class="tooltip"
                    :iconAriaLabel="coreString('identifierAriaLabel')"
                    :tooltipText="coreString('identifierTooltip')"
                  />
                </th>
                <th>
                  {{ coreString('genderLabel') }}
                </th>
                <th>
                  {{ coreString('birthYearLabel') }}
                </th>
              </template>
              <th class="user-action-button">
                <span class="visuallyhidden">
                  {{ $tr('userActionsColumnHeader') }}
                </span>
              </th>

            </template>
            <template #tbody>
              <tbody>
                <tr
                  v-for="user in items"
                  :key="user.id"
                >
                  <td>
                    <KLabeledIcon
                      icon="person"
                      :label="user.full_name"
                    />
                    <UserTypeDisplay
                      aria-hidden="true"
                      :userType="user.kind"
                      :omitLearner="true"
                      class="role-badge"
                      :style="{
                        color: $themeTokens.textInverted,
                        backgroundColor: $themeTokens.annotation,
                      }"
                    />
                  </td>
                  <td class="visuallyhidden">
                    {{ user.kind }}
                  </td>
                  <td>
                    <span dir="auto">
                      {{ user.username }}
                    </span>
                  </td>
                  <template>
                    <td class="id-col">
                      <span v-if="user.id_number">
                        {{ user.id_number }}
                      </span>
                      <KEmptyPlaceholder v-else />
                    </td>
                    <td>
                      <GenderDisplayText :gender="user.gender" />
                    </td>
                    <td>
                      <BirthYearDisplayText :birthYear="user.birth_year" />
                    </td>
                  </template>
                  <td class="core-table-button-col">
                    <slot name="action" :user="user"></slot>
                    <template>
                      <KDropdownMenu
                        :text="$tr('optionsButtonLabel')"
                        :options="manageUserOptions(user.id)"
                        :disabled="!userCanBeEdited(user)"
                        appearance="flat-button"
                        @select="handleManageUserSelection($event, user)"
                      />
                    </template>
                  </td>
                </tr>
              </tbody>
            </template>
          </CoreTable>
          <p
            v-if="!items.length"
            class="empty-message"
          >
            {{ emptyMessageForItems(items, filterInput) }}
          </p>

        </div>

      </template>
    </PaginatedListContainer>

    <!-- Modals -->

    <ResetUserPasswordModal
      v-if="modalShown === Modals.RESET_USER_PASSWORD"
      :id="selectedUser.id"
      :username="selectedUser.username"
      @cancel="closeModal"
    />

    <DeleteUserModal
      v-if="modalShown === Modals.DELETE_USER"
      :id="selectedUser.id"
      :username="selectedUser.username"
      @cancel="closeModal"
    />
  </KPageContainer>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import cloneDeep from 'lodash/cloneDeep';
  import PaginatedListContainer from 'kolibri.coreVue.components.PaginatedListContainer';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import BirthYearDisplayText from 'kolibri.coreVue.components.BirthYearDisplayText';
  import GenderDisplayText from 'kolibri.coreVue.components.GenderDisplayText';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import { Modals } from '../../constants';
  import ResetUserPasswordModal from './ResetUserPasswordModal';
  import DeleteUserModal from './DeleteUserModal';

  const ALL_FILTER = 'all';

  export default {
    name: 'UserPage',
    metaInfo() {
      return {
        title: this.coreString('usersLabel'),
      };
    },
    components: {
      ResetUserPasswordModal,
      DeleteUserModal,
      PaginatedListContainer,
      CoreInfoIcon,
      GenderDisplayText,
      BirthYearDisplayText,
      CoreTable,
      UserTypeDisplay,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        roleFilter: null,
        selectedUser: null,
        modalShown: null,
      };
    },
    computed: {
      ...mapGetters(['currentUserId', 'isSuperuser']),
      ...mapState('userManagement', ['facilityUsers']),
      Modals: () => Modals,
      userKinds() {
        return [
          { label: this.coreString('allLabel'), value: ALL_FILTER },
          { label: this.coreString('learnersLabel'), value: UserKinds.LEARNER },
          { label: this.coreString('coachesLabel'), value: UserKinds.COACH },
          { label: this.$tr('admins'), value: UserKinds.ADMIN },
          { label: this.$tr('superAdmins'), value: UserKinds.SUPERUSER },
        ];
      },
      usersFilteredByRow() {
        return this.facilityUsers.filter(user => this.userMatchesRole(user, this.roleFilter));
      },
    },
    beforeMount() {
      this.roleFilter = this.userKinds[0];
    },
    methods: {
      emptyMessageForItems(items, filterText) {
        if (this.facilityUsers.length === 0) {
          return this.$tr('noUsersExist');
        } else if (this.roleFilter && filterText === '') {
          switch (this.roleFilter.value) {
            case UserKinds.LEARNER:
              return this.$tr('noLearnersExist');
            case UserKinds.COACH:
              return this.$tr('noCoachesExist');
            case UserKinds.ADMIN:
              return this.$tr('noAdminsExist');
            case UserKinds.SUPERUSER:
              return this.$tr('noSuperAdminsExist');
            default:
              return '';
          }
        } else if (items.length === 0) {
          return this.$tr('allUsersFilteredOut', { filterText });
        }
        return '';
      },
      closeModal() {
        this.modalShown = '';
      },
      userMatchesRole(user, roleFilter) {
        const { value: filterKind } = roleFilter;
        if (filterKind === ALL_FILTER) {
          return true;
        }
        if (user.kind === UserKinds.ASSIGNABLE_COACH) {
          return filterKind === UserKinds.COACH;
        }
        if (filterKind === UserKinds.ADMIN) {
          return user.kind === UserKinds.ADMIN || user.kind === UserKinds.SUPERUSER;
        }
        if (filterKind === UserKinds.SUPERUSER) {
          return user.kind === UserKinds.SUPERUSER;
        }
        return filterKind === user.kind;
      },
      manageUserOptions(userId) {
        return [
          { label: this.coreString('editDetailsAction'), value: Modals.EDIT_USER },
          { label: this.$tr('resetUserPassword'), value: Modals.RESET_USER_PASSWORD },
          {
            label: this.coreString('deleteAction'),
            value: Modals.DELETE_USER,
            disabled: userId === this.currentUserId,
          },
        ];
      },
      handleManageUserSelection(selection, user) {
        if (selection.value === Modals.EDIT_USER) {
          const link = cloneDeep(this.$store.getters.facilityPageLinks.UserEditPage);
          link.params.id = user.id;
          this.$router.push(link);
        } else {
          this.selectedUser = user;
          this.modalShown = selection.value;
        }
      },
      userCanBeEdited(user) {
        // If logged-in user is a superuser, then they can edit anybody (including other SUs).
        // Otherwise, only non-SUs can be edited.
        return this.isSuperuser || !user.is_superuser;
      },
    },
    $trs: {
      searchText: 'Search for a user…',
      admins: 'Admins',
      superAdmins: 'Super admins',
      newUserButtonLabel: 'New User',
      noUsersExist: 'No users exist',
      allUsersFilteredOut: "No users match the filter: '{filterText}'",
      optionsButtonLabel: 'Options',
      resetUserPassword: 'Reset password',
      noLearnersExist: 'No learners exist',
      noCoachesExist: 'No coaches exist',
      noSuperAdminsExist: 'No super admins exist',
      noAdminsExist: 'No admins exist',
      role: 'Role',
      userActionsColumnHeader: 'Actions',
    },
  };

</script>


<style lang="scss" scoped>

  .empty-message {
    margin-bottom: 16px;
  }

  .role-badge {
    display: inline-block;
    padding: 0;
    padding-right: 8px;
    padding-left: 8px;
    margin-left: 16px;
    font-size: small;
    white-space: nowrap;
    border-radius: 4px;
  }

  .tooltip {
    margin-left: 2px;
  }

  td.id-col {
    max-width: 120px;
  }

  .move-down {
    position: relative;
    margin-top: 24px;
  }

  .type-filter {
    margin-bottom: 0;
  }

  .user-roster {
    overflow-x: auto;
  }

</style>
