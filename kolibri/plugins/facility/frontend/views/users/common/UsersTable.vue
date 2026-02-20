<template>

  <div class="flex-column">
    <div class="paginated-wrapper">
      <KTable
        class="move-down user-roster"
        :stickyColumns="stickyColumns"
        :headers="tableHeaders"
        :caption="coreStrings.usersLabel$()"
        :rows="tableRows"
        :dataLoading="dataLoading"
        :emptyMessage="emptyMessage"
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
          <!-- Column 0: Selection Checkbox -->
          <div v-if="colIndex === 0">
            <KCheckbox
              :label="getTranslatedSelectedArialabel(content)"
              :checked="isUserSelected(content)"
              :showLabel="false"
              :aria-label="selectLabel$()"
              @change="() => handleUserSelectionToggle(content)"
            />
          </div>
          <!-- Column 1: User name -->
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
          <!-- Column 3: User identifier -->
          <span v-else-if="colIndex === 3">
            <KOptionalText :text="content ? content : ''" />
          </span>
          <!-- Column 4: User gender -->
          <span v-else-if="colIndex === 4">
            <GenderDisplayText :gender="content" />
          </span>
          <!-- Column 5: User birth year -->
          <span v-else-if="colIndex === 5">
            <BirthYearDisplayText :birthYear="content" />
          </span>
          <!-- Column 6: User creation/deletion date -->
          <span v-else-if="colIndex === 6">
            <KOptionalText
              :text="content.text"
              :style="content.style"
            />
          </span>
          <!-- Column 7: User options -->
          <span v-else-if="colIndex === 7">
            <KIconButton
              icon="optionsVertical"
              :disabled="!userCanBeEdited(content)"
              :style="activeRowId === row[0].id ? { backgroundColor: 'rgba(0,0,0,.1)' } : {}"
              @click="handleSelectedButtonState(row[0].id)"
            >
              <template #menu>
                <slot
                  name="userDropdownMenu"
                  :user="content"
                >
                  <KDropdownMenu
                    :options="getManageUserOptions(content.id)"
                    @select="handleManageUserAction($event, content)"
                    @close="activeRowId = null"
                  />
                </slot>
              </template>
            </KIconButton>
          </span>
        </template>
      </KTable>
    </div>
    <ResetUserPasswordModal
      v-if="modalShown === Modals.RESET_USER_PASSWORD"
      :id="userToChange.id"
      :username="userToChange.username"
      @close="closeModal"
    />

    <MoveToTrashModal
      v-if="modalShown === Modals.DELETE_USER"
      :selectedUsers="userToChangeSet"
      :onChange="event => $emit('change', event)"
      @close="closeModal"
    />
  </div>

</template>


<script>

  import store from 'kolibri/store';
  import cloneDeep from 'lodash/cloneDeep';
  import debounce from 'lodash/debounce';
  import pickBy from 'lodash/pickBy';
  import useNow from 'kolibri/composables/useNow';
  import { toRefs, ref, computed, getCurrentInstance } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { getUserKindDisplayMap } from 'kolibri-common/uiText/userKinds';
  import UserTypeDisplay from 'kolibri-common/components/UserTypeDisplay';
  import CoreInfoIcon from 'kolibri-common/components/labels/CoreInfoIcon';
  import GenderDisplayText from 'kolibri-common/components/userAccounts/GenderDisplayText';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import BirthYearDisplayText from 'kolibri-common/components/userAccounts/BirthYearDisplayText';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import useUser from 'kolibri/composables/useUser';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';

  import { Modals } from '../../../constants';
  import MoveToTrashModal from './MoveToTrashModal.vue';
  import ResetUserPasswordModal from './ResetUserPasswordModal';

  const SELECTION_COLUMN_ID = 'selection';

  // Constant for the number of days until the user is permanently deleted
  const PERMANENT_DELETION_DAYS = 30;
  // Threshold to show that a user is going to be permanently deleted soon
  const DELETION_SOON_THRESHOLD_DAYS = 7;

  export default {
    name: 'UsersTable',
    components: {
      CoreInfoIcon,
      UserTypeDisplay,
      MoveToTrashModal,
      GenderDisplayText,
      BirthYearDisplayText,
      ResetUserPasswordModal,
    },
    setup(props, { emit }) {
      const route = useRoute();
      const router = useRouter();
      const { isSuperuser, currentUserId } = useUser();
      const currentInstance = getCurrentInstance();
      const $formatDate = currentInstance.proxy.$formatDate;
      const $formatRelative = currentInstance.proxy.$formatRelative;
      const { now } = useNow();
      const { facilityUsers } = toRefs(props);
      const modalShown = ref(null);
      const userToChange = ref(null);
      const activeRowId = ref(null);

      const { selectAllLabel$ } = enhancedQuizManagementStrings;
      const {
        createdAt$,
        selectLabel$,
        resetPassword$,
        noUsersInFacility$,
        noUsersMatchSearch$,
        noUsersMatchFilter$,
        noUsersMatchFiltersAndSearch$,
        permanentDeletion$,
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

      const isShowingDeletedUsers = computed(() =>
        facilityUsers.value.some(user => user.date_deleted),
      );

      const dateColumn = computed(() => {
        const label = isShowingDeletedUsers.value ? permanentDeletion$() : createdAt$();
        const columnId = isShowingDeletedUsers.value ? 'date_deleted' : 'date_joined';
        return {
          label,
          dataType: 'date',
          minWidth: '150px',
          width: '10%',
          columnId,
        };
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
          dateColumn.value,
          {
            label: '',
            dataType: 'undefined',
            width: '10%',
            columnId: 'userActions',
          },
        ];
      });

      const getRelativeDeletedDate = date => {
        const permanentDeletionDate = new Date(date);
        permanentDeletionDate.setDate(permanentDeletionDate.getDate() + PERMANENT_DELETION_DAYS);

        const style = {};
        // If permanent deletion will occur in DELETION_SOON_THRESHOLD_DAYS days, set error color
        const deletionSoon = new Date();
        deletionSoon.setDate(deletionSoon.getDate() + DELETION_SOON_THRESHOLD_DAYS);
        if (permanentDeletionDate < deletionSoon) {
          style.color = themeTokens().error;
        }

        return {
          text: $formatRelative(permanentDeletionDate, { now }),
          style,
        };
      };

      const getDateContent = user => {
        if (isShowingDeletedUsers.value) {
          return getRelativeDeletedDate(user.date_deleted);
        }
        return {
          text: $formatDate(user.date_joined) || '',
        };
      };

      const tableRows = computed(() => {
        return facilityUsers.value.map(user => {
          return [
            user,
            user.full_name || '',
            user.username || '',
            user.id_number || '',
            user.gender || '',
            user.birth_year || '',
            getDateContent(user),
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

      const userToChangeSet = computed(() => {
        return userToChange.value && userToChange.value.id
          ? new Set([userToChange.value.id])
          : new Set();
      });

      // --- Methods ---
      const handleSelectAllToggle = () => {
        const visibleUserIds = facilityUsers.value.map(user => user.id);
        const { checked } = selectAllState.value;

        if (checked) {
          _selectedUsers.value = new Set(
            [..._selectedUsers.value].filter(id => !visibleUserIds.includes(id)),
          );
        } else {
          const newSet = new Set(_selectedUsers.value);
          visibleUserIds.forEach(id => newSet.add(id));
          _selectedUsers.value = newSet;
        }
      };

      const handleUserSelectionToggle = user => {
        const newSet = new Set(_selectedUsers.value);
        if (newSet.has(user.id)) {
          newSet.delete(user.id);
        } else {
          newSet.add(user.id);
        }
        _selectedUsers.value = newSet;
      };

      const isUserSelected = user => {
        return _selectedUsers.value.has(user.id);
      };

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
          query: query,
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

      const emptyMessage = computed(() => {
        return getEmptyMessageForItems(facilityUsers.value);
      });

      const getEmptyMessageForItems = items => {
        const activeFiltersCount = props.numAppliedFilters;

        if (items.length === 0) {
          if (searchTerm.value && activeFiltersCount > 0) {
            return noUsersMatchFiltersAndSearch$({ filtersCount: activeFiltersCount });
          }
          if (searchTerm.value) {
            return noUsersMatchSearch$({ filterText: searchTerm.value });
          }
          if (activeFiltersCount > 0) {
            return noUsersMatchFilter$({ filtersCount: activeFiltersCount });
          }
          return noUsersInFacility$();
        }
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
      const handleSelectedButtonState = id => {
        activeRowId.value = id;
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

      const { windowBreakpoint } = useKResponsiveWindow();
      const stickyColumns = computed(() => [
        windowBreakpoint.value <= 2 ? 'first' : 'firstTwo',
        'last',
      ]);

      return {
        // Computed Properties
        tableHeaders,
        tableRows,
        selectAllState,
        userRoleBadgeStyle,
        Modals,
        modalShown,
        userToChange,
        userToChangeSet,
        stickyColumns,
        activeRowId,

        // Methods
        handleSelectedButtonState,
        handleSelectAllToggle,
        handleUserSelectionToggle,
        isUserSelected,
        changeSortHandler,
        userCanBeEdited,
        getTranslatedSelectedArialabel,
        emptyMessage,
        closeModal,
        getManageUserOptions,
        handleManageUserAction,

        // Strings
        coreStrings,
        selectLabel$,
        selectAllLabel$,
      };
    },
    props: {
      facilityUsers: {
        type: Array,
        required: true,
      },
      dataLoading: {
        type: Boolean,
        default: false,
      },
      selectedUsers: {
        type: Set,
        required: true,
      },
      numAppliedFilters: {
        type: Number,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .move-down {
    position: relative;
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

  .user-type-icon {
    width: auto;
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

  .flex-column {
    display: flex;
    flex-direction: column;
    // Min height is set to 0 to allow flex items to shrink
    min-height: 0;
  }

  /deep/ .k-table-wrapper {
    tr td:first-child,
    tr th:first-child {
      padding: 0 1em;
    }

    tr td:last-child,
    tr th:last-child {
      padding: 0 1em;
    }
  }

</style>
