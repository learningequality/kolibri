<template>

  <FacilityAppBarPage>
    <KPageContainer>
      <p>
        <KRouterLink
          v-if="userIsMultiFacilityAdmin"
          :to="{
            name: facilityPageLinks.AllFacilitiesPage.name,
            params: { subtopicName: 'UserPage' },
          }"
          icon="back"
          :text="coreString('changeLearningFacility')"
        />
      </p>
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

      <PaginatedListContainerWithBackend
        v-model="currentPage"
        :items="facilityUsers"
        :itemsPerPage="itemsPerPage"
        :totalPageNumber="totalPages"
        :roleFilter="roleFilter"
        :numFilteredItems="usersCount"
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

        <template #filter>
          <FilterTextbox
            v-model="search"
            :placeholder="$tr('searchText')"
          />
        </template>

        <KTable
          class="move-down user-roster"
          :headers="tableHeaders"
          :caption="$tr('tableCaption')"
          :rows="tableRows"
          :dataLoading="dataLoading"
          :emptyMessage="emptyMessageForItems(facilityUsers, search)"
        >
          <template #header="{ header, colIndex }">
            <span :class="{ visuallyhidden: colIndex === 5 }">{{ header.label }}</span>
            <span v-if="colIndex === 2">
              <CoreInfoIcon
                class="tooltip"
                :iconAriaLabel="coreString('identifierAriaLabel')"
                :tooltipText="coreString('identifierTooltip')"
              />
            </span>
          </template>
          <template #cell="{ content, colIndex, row }">
            <span v-if="colIndex === 0">
              <KLabeledIcon
                icon="person"
                :label="content"
                :style="{ color: $themeTokens.text }"
              />
              <UserTypeDisplay
                aria-hidden="true"
                :userType="row[5].kind"
                :omitLearner="true"
                class="role-badge"
                data-test="userRoleBadge"
                :class="$computedClass(userRoleBadgeStyle)"
              />
            </span>
            <span v-else-if="colIndex === 2">
              <KOptionalText :text="content ? content : ''" />
            </span>
            <span v-else-if="colIndex === 3">
              <GenderDisplayText :gender="content" />
            </span>
            <span v-else-if="colIndex === 4">
              <BirthYearDisplayText :birthYear="content" />
            </span>
            <span
              v-else-if="colIndex === 5"
              class="core-table-button-col"
            >
              <KButton
                appearance="flat-button"
                hasDropdown
                :text="$tr('optionsButtonLabel')"
                :disabled="!userCanBeEdited(content)"
              >
                <KDropdownMenu
                  :options="manageUserOptions(content.id)"
                  @select="handleManageUserSelection($event, content)"
                />
              </KButton>
            </span>
          </template>
        </KTable>
      </PaginatedListContainerWithBackend>

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
  </FacilityAppBarPage>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import debounce from 'lodash/debounce';
  import pickBy from 'lodash/pickBy';
  import { UserKinds } from 'kolibri/constants';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import UserTypeDisplay from 'kolibri-common/components/UserTypeDisplay';
  import CoreInfoIcon from 'kolibri-common/components/labels/CoreInfoIcon';
  import GenderDisplayText from 'kolibri-common/components/userAccounts/GenderDisplayText';
  import BirthYearDisplayText from 'kolibri-common/components/userAccounts/BirthYearDisplayText';
  import cloneDeep from 'lodash/cloneDeep';
  import PaginatedListContainerWithBackend from 'kolibri-common/components/PaginatedListContainerWithBackend';
  import useUser from 'kolibri/composables/useUser';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { Modals } from '../../constants';
  import FacilityAppBarPage from '../FacilityAppBarPage';
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
      UserTypeDisplay,
      GenderDisplayText,
      BirthYearDisplayText,
      CoreInfoIcon,
      FacilityAppBarPage,
      FilterTextbox,
      ResetUserPasswordModal,
      DeleteUserModal,
      PaginatedListContainerWithBackend,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { currentUserId, isSuperuser } = useUser();
      const { userIsMultiFacilityAdmin } = useFacilities();
      return {
        currentUserId,
        isSuperuser,
        userIsMultiFacilityAdmin,
      };
    },
    data() {
      return {
        selectedUser: null,
        modalShown: null,
      };
    },
    computed: {
      ...mapGetters(['facilityPageLinks']),
      ...mapState('userManagement', ['facilityUsers', 'totalPages', 'usersCount', 'dataLoading']),
      Modals: () => Modals,
      tableHeaders() {
        return [
          {
            label: this.coreString('fullNameLabel'),
            dataType: 'string',
            minWidth: '300px',
            width: '40%',
            columnId: 'userFullName',
          },
          {
            label: this.coreString('usernameLabel'),
            dataType: 'string',
            minWidth: '150px',
            width: '20%',
            columnId: 'username',
          },
          {
            label: this.coreString('identifierLabel'),
            dataType: 'string',
            minWidth: '150px',
            width: '10%',
            columnId: 'identifier',
          },
          {
            label: this.coreString('genderLabel'),
            dataType: 'string',
            minWidth: '150px',
            width: '10%',
            columnId: 'gender',
          },
          {
            label: this.coreString('birthYearLabel'),
            dataType: 'date',
            minWidth: '100px',
            width: '10%',
            columnId: 'birth_year',
          },
          {
            label: this.coreString('userActionsColumnHeader'),
            dataType: 'undefined',
            minWidth: '150px',
            width: '10%',
            columnId: 'userActions',
          },
        ];
      },
      tableRows() {
        return this.facilityUsers.map(user => {
          return [
            user.full_name,
            user.username,
            user.id_number,
            user.gender,
            user.birth_year,
            user,
          ];
        });
      },
      userKinds() {
        return [
          { label: this.coreString('allLabel'), value: ALL_FILTER },
          { label: this.coreString('learnersLabel'), value: UserKinds.LEARNER },
          { label: this.coreString('coachesLabel'), value: UserKinds.COACH },
          { label: this.$tr('admins'), value: UserKinds.ADMIN },
          { label: this.$tr('superAdmins'), value: UserKinds.SUPERUSER },
        ];
      },
      userRoleBadgeStyle() {
        return {
          color: this.$themeTokens.textInverted,
          backgroundColor: this.$themeTokens.annotation,
          '::selection': {
            color: this.$themeTokens.text,
          },
        };
      },
      roleFilter: {
        get() {
          return (
            this.userKinds.find(k => k.value === this.$route.query.user_type) || this.userKinds[0]
          );
        },
        set(value) {
          value = value.value;
          if (value === ALL_FILTER) {
            value = null;
          }
          this.$router.push({
            ...this.$route,
            query: pickBy({
              ...this.$route.query,
              user_type: value,
              page: null,
            }),
          });
        },
      },
      search: {
        get() {
          return this.$route.query.search || '';
        },
        set(value) {
          this.debouncedSearchTerm(value);
        },
      },
      currentPage: {
        get() {
          return Number(this.$route.query.page || 1);
        },
        set(value) {
          this.$router.push({
            ...this.$route,
            query: pickBy({
              ...this.$route.query,
              page: value,
            }),
          });
        },
      },
      itemsPerPage: {
        get() {
          return this.$route.query.page_size || 30;
        },
        set(value) {
          this.$router.push({
            ...this.$route,
            query: pickBy({
              ...this.$route.query,
              page_size: value,
              page: null,
            }),
          });
        },
      },
    },
    created() {
      this.debouncedSearchTerm = debounce(this.emitSearchTerm, 500);
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
      emitSearchTerm(value) {
        if (value === '') {
          value = null;
        }
        this.$router.push({
          ...this.$route,
          query: pickBy({
            ...this.$route.query,
            search: value,
            page: null,
          }),
        });
      },
    },
    $trs: {
      tableCaption: {
        message: 'Users',
        context: 'Caption for the user table.',
      },
      searchText: {
        message: 'Search for a user…',
        context: 'Refers to the search option on the user page.',
      },
      admins: {
        message: 'Admins',
        context: 'Refers to the list of admins in a facility.',
      },
      superAdmins: {
        message: 'Super admins',
        context: 'A user type.',
      },
      newUserButtonLabel: {
        message: 'New User',
        context: 'Button to create new user.',
      },
      noUsersExist: {
        message: 'No users exist',
        context: "Displayed when there are no users in the facility on the 'Users' page.",
      },
      allUsersFilteredOut: {
        message: "No users match the filter: '{filterText}'",
        context: "Refers to the 'Search for a user' filter when no users are found.",
      },
      optionsButtonLabel: {
        message: 'Options',
        context: 'User options button.',
      },
      resetUserPassword: {
        message: 'Reset password',
        context: "Option to reset a user's password.",
      },
      noLearnersExist: {
        message: 'There are no learners in this facility',
        context:
          "Displayed when there are no learners in the facility. Seen when using the 'User type' filter on the 'Users' page.",
      },
      noCoachesExist: {
        message: 'There are no coaches in this facility',
        context:
          "Displayed when there are no coaches in the facility. Seen when using the 'User type' filter on the 'Users' page.",
      },
      noSuperAdminsExist: {
        message: 'There are no super admins in this facility',
        context:
          "Displayed when there are no super admins in the facility. Seen when using the 'User type' filter on the 'Users' page.",
      },
      noAdminsExist: {
        message: 'There are no admins in this facility',
        context:
          "Displayed when there are no admins in the facility. Seen when using the 'User type' filter on the 'Users' page.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .move-down {
    position: relative;
    margin-top: 24px;
  }

  .type-filter {
    margin-bottom: 0;
  }

  .role-badge {
    display: inline-block;
    padding: 1px;
    padding-right: 8px;
    padding-left: 8px;
    margin-left: 16px;
    font-size: small;
    white-space: nowrap;
    border-radius: 4px;
  }

  .labeled-icon-wrapper {
    width: auto;
  }

  .user-roster {
    overflow-x: auto;
  }

</style>
