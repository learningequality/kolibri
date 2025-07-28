<template>

  <div>
    <PaginatedListContainerWithBackend
      v-model="currentPage"
      :itemsPerPage="itemsPerPage"
      :totalPageNumber="totalPages"
      :numFilteredItems="usersCount"
    >
      <KGrid>
        <KGridItem
          :layout="{ alignment: 'right' }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <div class="search-filter-section">
            <FilterTextbox
              v-model="searchTerm"
              :placeholder="coreStrings.searchForUser$()"
              :aria-label="coreStrings.searchForUser$()"
              class="move-down search-box"
            />
            <KRouterLink
              appearance="basic-link"
              :text="filterLabel$()"
              class="filter-button move-down"
              :to="overrideRoute($route, { name: filterPageName })"
            />
          </div>
        </KGridItem>
        <KGridItem
          :layout="{ alignment: 'right' }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
          class="move-down"
        >
          <span v-if="selectedUsers.size > 0">
            <span class="selected-count">
              {{ numUsersSelected$({ n: selectedUsers.size }) }}
            </span>

            <KButton
              appearance="basic-link"
              :text="coreStrings.clearAction$()"
              @click="clearSelectedUsers"
            />
          </span>
          <slot name="userActions"></slot>
        </KGridItem>
      </KGrid>
      <KTable
        class="move-down user-roster"
        :headers="tableHeaders"
        :caption="coreStrings.usersLabel$()"
        :rows="tableRows"
        :dataLoading="dataLoading"
        :emptyMessage="getEmptyMessageForItems(facilityUsers)"
        sortable
        disableBuiltinSorting
        @changeSort="changeSortHandler"
      >
        <template #header="{ header, colIndex }">
          <template v-if="colIndex === 0">
            <span class="screen-reader-only">{{ selectLabel$() }}</span>
            <KCheckbox
              :label="selectAllLabel$()"
              :checked="selectAllState.checked"
              :indeterminate="selectAllState.indeterminate"
              :showLabel="false"
              @change="handleSelectAllToggle"
            />
          </template>
          <template v-else>
            <span :class="{ visuallyhidden: colIndex === 7 }">{{ header.label }}</span>
            <span v-if="colIndex === 3">
              <CoreInfoIcon
                class="tooltip"
                :iconAriaLabel="coreStrings.identifierAriaLabel$()"
                :tooltipText="coreStrings.identifierTooltip$()"
              />
            </span>
          </template>
        </template>

        <template #cell="{ content, colIndex, row }">
          <div v-if="colIndex === 0">
            <KCheckbox
              :label="getTranslatedSelectedArialabel(content)"
              :checked="isUserSelected(content)"
              :showLabel="false"
              :aria-label="selectLabel$()"
              @change="() => handleUserSelectionToggle(content)"
            />
          </div>
          <span v-else-if="colIndex === 1">
            <KLabeledIcon
              class="user-type-icon"
              icon="person"
              :label="content"
              :style="{ color: $themeTokens.text }"
            />
            <UserTypeDisplay
              aria-hidden="true"
              :userType="row[0].kind"
              :omitLearner="true"
              class="role-badge"
              data-test="userRoleBadge"
              :class="$computedClass(userRoleBadgeStyle)"
            />
          </span>
          <span v-else-if="colIndex === 3">
            <KOptionalText :text="content ? content : ''" />
          </span>
          <span v-else-if="colIndex === 4">
            <GenderDisplayText :gender="content" />
          </span>
          <span v-else-if="colIndex === 5">
            <BirthYearDisplayText :birthYear="content" />
          </span>
          <span v-else-if="colIndex === 6">
            <KOptionalText :text="content" />
          </span>
          <span v-else-if="colIndex === 7">
            <KIconButton
              icon="optionsVertical"
              :disabled="!userCanBeEdited(content)"
            >
              <template #menu>
                <slot
                  name="userDropdownMenu"
                  :user="content"
                >
                  <KDropdownMenu
                    :options="getManageUserOptions(content.id)"
                    @select="handleManageUserAction($event, content)"
                  />
                </slot>
              </template>
            </KIconButton>
          </span>
        </template>
      </KTable>
    </PaginatedListContainerWithBackend>
    <ResetUserPasswordModal
      v-if="modalShown === Modals.RESET_USER_PASSWORD"
      :id="userToChange.id"
      :username="userToChange.username"
      @close="closeModal"
    />

    <DeleteUserModal
      v-if="modalShown === Modals.DELETE_USER"
      :id="userToChange.id"
      :username="userToChange.username"
      @close="closeModal"
      @change="$emit('change')"
    />
  </div>

</template>


<script>

  import store from 'kolibri/store';
  import cloneDeep from 'lodash/cloneDeep';
  import { toRefs, ref, computed, onBeforeUnmount, getCurrentInstance } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import pickBy from 'lodash/pickBy';
  import debounce from 'lodash/debounce';
  import { UserKinds } from 'kolibri/constants';
  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { getUserKindDisplayMap } from 'kolibri-common/uiText/userKinds';
  import UserTypeDisplay from 'kolibri-common/components/UserTypeDisplay';
  import CoreInfoIcon from 'kolibri-common/components/labels/CoreInfoIcon';
  import GenderDisplayText from 'kolibri-common/components/userAccounts/GenderDisplayText';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import BirthYearDisplayText from 'kolibri-common/components/userAccounts/BirthYearDisplayText';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import PaginatedListContainerWithBackend from 'kolibri-common/components/PaginatedListContainerWithBackend';
  import useUser from 'kolibri/composables/useUser';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';

  import { Modals } from '../../../constants';
  import { overrideRoute } from '../../../utils';
  import DeleteUserModal from './DeleteUserModal';
  import ResetUserPasswordModal from './ResetUserPasswordModal';

  const ALL_FILTER = 'all';
  const SELECTION_COLUMN_ID = 'selection';

  export default {
    name: 'UsersTable',
    components: {
      CoreInfoIcon,
      FilterTextbox,
      UserTypeDisplay,
      DeleteUserModal,
      GenderDisplayText,
      BirthYearDisplayText,
      ResetUserPasswordModal,
      PaginatedListContainerWithBackend,
    },
    setup(props, { emit }) {
      const route = useRoute();
      const router = useRouter();
      const { isSuperuser, currentUserId } = useUser();
      const $formatDate = getCurrentInstance().proxy.$formatDate;

      const { facilityUsers } = toRefs(props);
      const modalShown = ref(null);
      const userToChange = ref(null);

      const { selectAllLabel$ } = enhancedQuizManagementStrings;
      const {
        createdAt$,
        selectLabel$,
        filterLabel$,
        noAdminsExist$,
        resetPassword$,
        noCoachesExist$,
        noLearnersExist$,
        numUsersSelected$,
        noSuperAdminsExist$,
        allUsersFilteredOut$,
      } = bulkUserManagementStrings;

      // --- Computed Properties ---
      const _selectedUsers = computed({
        get() {
          return props.selectedUsers || new Set();
        },
        set(value) {
          emit('update:selectedUsers', value);
        },
      });

      const tableHeaders = computed(() => {
        return [
          {
            label: selectAllLabel$(),
            dataType: 'undefined',
            width: '48px',
            columnId: SELECTION_COLUMN_ID,
          },
          {
            label: coreStrings.fullNameLabel$(),
            dataType: 'string',
            minWidth: '300px',
            width: '40%',
            columnId: 'full_name',
          },
          {
            label: coreStrings.usernameLabel$(),
            dataType: 'string',
            minWidth: '150px',
            width: '15%',
            columnId: 'username',
          },
          {
            label: coreStrings.identifierLabel$(),
            dataType: 'string',
            minWidth: '150px',
            width: '10%',
            columnId: 'id_number',
          },
          {
            label: coreStrings.genderLabel$(),
            dataType: 'string',
            minWidth: '120px',
            width: '10%',
            columnId: 'gender',
          },
          {
            label: coreStrings.birthYearLabel$(),
            dataType: 'date',
            minWidth: '120px',
            width: '10%',
            columnId: 'birth_year',
          },
          {
            label: createdAt$(),
            dataType: 'date',
            minWidth: '150px',
            width: '10%',
            columnId: 'date_joined',
          },
          {
            label: '',
            dataType: 'undefined',
            width: '10%',
            columnId: 'userActions',
          },
        ];
      });

      const tableRows = computed(() => {
        return facilityUsers.value.map(user => {
          return [
            user,
            user.full_name || '',
            user.username || '',
            user.id_number || '',
            user.gender || '',
            user.birth_year || '',
            $formatDate(user.date_joined),
            user,
          ];
        });
      });

      const selectAllState = computed(() => {
        const visibleUserIds = facilityUsers.value.map(user => user.id);
        const selectedVisibleUsers = visibleUserIds.filter(id => _selectedUsers.value.has(id));

        const isChecked =
          selectedVisibleUsers.length === visibleUserIds.length && selectedVisibleUsers.length > 0;
        const isIndeterminate = selectedVisibleUsers.length > 0 && !isChecked;

        return { checked: isChecked, indeterminate: isIndeterminate };
      });

      const userKinds = computed(() => {
        return [
          { label: coreStrings.allLabel$(), value: ALL_FILTER },
          { label: coreStrings.learnersLabel$(), value: UserKinds.LEARNER },
          { label: coreStrings.coachesLabel$(), value: UserKinds.COACH },
          { label: coreStrings.adminsLabel$(), value: UserKinds.ADMIN },
          { label: coreStrings.superAdminsLabel$(), value: UserKinds.SUPERUSER },
        ];
      });

      const userRoleBadgeStyle = computed(() => {
        const $themeTokens = themeTokens();
        return {
          color: $themeTokens.textInverted,
          backgroundColor: $themeTokens.annotation,
          '::selection': {
            color: $themeTokens.text,
          },
        };
      });

      const roleFilter = computed({
        get() {
          return userKinds.value.find(k => k.value === route.query.user_type) || userKinds.value[0];
        },
        set(value) {
          value = value.value;
          if (value === ALL_FILTER) {
            value = null;
          }
          router.push({
            ...route,
            query: pickBy({
              ...route.query,
              user_type: value,
              page: null,
            }),
          });
        },
      });

      const emitSearchTerm = value => {
        if (value === '') {
          value = null;
        }
        router.push({
          ...route,
          query: pickBy({
            ...route.query,
            search: value,
            page: null,
          }),
        });
      };
      const debouncedSearchTerm = debounce(emitSearchTerm, 300);

      const searchTerm = computed({
        get() {
          return route.query.search || '';
        },
        set(value) {
          debouncedSearchTerm(value);
        },
      });

      const currentPage = computed({
        get() {
          return Number(route.query.page) || 1;
        },
        set(value) {
          router.push({
            ...route,
            query: pickBy({
              ...route.query,
              page: value,
            }),
          });
        },
      });

      const itemsPerPage = computed({
        get() {
          return Number(route.query.page_size) || 30;
        },
        set(value) {
          router.push({
            ...route,
            query: pickBy({
              ...route.query,
              page_size: value,
              page: null,
            }),
          });
        },
      });

      // --- Methods ---
      const handleSelectAllToggle = () => {
        const visibleUserIds = facilityUsers.value.map(user => user.id);
        const { checked } = selectAllState.value;

        if (checked) {
          visibleUserIds.forEach(id => _selectedUsers.value.delete(id));
        } else {
          visibleUserIds.forEach(id => _selectedUsers.value.add(id));
        }

        _selectedUsers.value = new Set(_selectedUsers.value);
      };

      const handleUserSelectionToggle = user => {
        if (_selectedUsers.value.has(user.id)) {
          _selectedUsers.value.delete(user.id);
        } else {
          _selectedUsers.value.add(user.id);
        }
        _selectedUsers.value = new Set(_selectedUsers.value);
      };

      const clearSelectedUsers = () => {
        _selectedUsers.value = new Set();
      };

      const isUserSelected = user => {
        return _selectedUsers.value.has(user.id);
      };

      const changeSortHandler = ({ sortKey, sortOrder }) => {
        const columnId = tableHeaders.value[sortKey]?.columnId || null;
        const query = { ...route.query };
        if (query.ordering === columnId && query.order === sortOrder) {
          return;
        } else if (!sortOrder || !columnId || columnId === SELECTION_COLUMN_ID) {
          delete query.ordering;
          delete query.order;
        } else {
          query.ordering = columnId;
          query.order = sortOrder;
        }
        query.page = 1;
        router.push({
          path: route.path,
          query: pickBy(query),
        });
      };

      const userCanBeEdited = user => {
        // If logged-in user is a superuser, then they can edit anybody (including other SUs).
        // Otherwise, only non-SUs can be edited.
        return isSuperuser.value || !user.is_superuser;
      };

      const getTranslatedSelectedArialabel = user => {
        const userKindMap = getUserKindDisplayMap();
        return selectLabel$() + ' ' + user.full_name + ', ' + userKindMap[user.kind];
      };

      const getEmptyMessageForItems = items => {
        if (facilityUsers.value.length === 0) {
          return coreStrings.noUsersExistLabel$();
        } else if (roleFilter.value && searchTerm.value === '') {
          switch (roleFilter.value.value) {
            case UserKinds.LEARNER:
              return noLearnersExist$();
            case UserKinds.COACH:
              return noCoachesExist$();
            case UserKinds.ADMIN:
              return noAdminsExist$();
            case UserKinds.SUPERUSER:
              return noSuperAdminsExist$();
            default:
              return '';
          }
        } else if (items.length === 0) {
          return allUsersFilteredOut$({ filterText: searchTerm.value });
        }
        return '';
      };

      const closeModal = () => {
        modalShown.value = null;
        userToChange.value = null;
      };

      const getManageUserOptions = userId => {
        return [
          { label: coreStrings.editDetailsAction$(), value: Modals.EDIT_USER },
          { label: resetPassword$(), value: Modals.RESET_USER_PASSWORD },
          {
            label: coreStrings.deleteAction$(),
            value: Modals.DELETE_USER,
            disabled: userId === currentUserId.value,
          },
        ];
      };

      const handleManageUserAction = (action, user) => {
        if (action.value === Modals.EDIT_USER) {
          const link = cloneDeep(store.getters.facilityPageLinks.UserEditPage);
          link.params.id = user.id;
          router.push(link);
        } else {
          userToChange.value = user;
          modalShown.value = action.value;
        }
      };

      onBeforeUnmount(() => {
        const { query } = route;
        if (query.ordering || query.order || query.page) {
          router.replace({ query: null });
        }
      });

      return {
        // Computed Properties
        tableHeaders,
        tableRows,
        selectAllState,
        userRoleBadgeStyle,
        searchTerm,
        currentPage,
        itemsPerPage,
        Modals,
        modalShown,
        userToChange,

        // Methods
        handleSelectAllToggle,
        handleUserSelectionToggle,
        clearSelectedUsers,
        isUserSelected,
        changeSortHandler,
        overrideRoute,
        userCanBeEdited,
        getTranslatedSelectedArialabel,
        getEmptyMessageForItems,
        closeModal,
        getManageUserOptions,
        handleManageUserAction,

        // Strings
        coreStrings,
        selectLabel$,
        filterLabel$,
        selectAllLabel$,
        numUsersSelected$,
      };
    },
    props: {
      facilityUsers: {
        type: Array,
        required: true,
      },
      usersCount: {
        type: Number,
        required: true,
      },
      totalPages: {
        type: Number,
        required: true,
      },
      dataLoading: {
        type: Boolean,
        default: false,
      },
      filterPageName: {
        type: String,
        required: true,
      },
      selectedUsers: {
        type: Set,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .move-down {
    position: relative;
    margin-top: 24px;
  }

  .role-badge {
    display: inline-block;
    padding: 2px 8px;
    margin-left: 12px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    border-radius: 2px;
  }

  .user-roster {
    overflow-x: auto;
  }

  .search-filter-section {
    display: flex;
    justify-content: start;
  }

  .user-type-icon {
    width: auto;
  }

  .search-box {
    width: 294px;
  }

  .filter-button {
    padding-top: 8px;
    margin-left: 1em;
  }

  .screen-reader-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

</style>
