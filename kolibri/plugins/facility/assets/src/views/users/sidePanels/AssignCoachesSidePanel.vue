<template>

  <div>
    <SidePanelModal
      alignment="right"
      sidePanelWidth="700px"
      :addBottomBorder="false"
      @closePanel="closeSidePanel"
    >
      <template #header>
        <h1>{{ assignUsersHeading$({ num: selectedUsersCount }) }}</h1>
      </template>

      <div class="assign-coaches-content">
        <KCircularLoader v-if="isLoading" />
        <div v-else>
          <div
            v-if="showErrorWarning"
            class="assign-warning-label"
            :style="{ color: $themeTokens.error }"
          >
            <span>{{ defaultErrorMessage$() }}</span>
          </div>

          <div
            class="top-info-box"
            :style="{ backgroundColor: $themePalette.grey.v_100 }"
          >
            <template v-if="ineligibleUsersCount > 0">
              <div class="info-flex">
                <KIcon
                  icon="infoOutline"
                  class="info-icon"
                />
                <div class="info-lines">
                  <div class="info-line">
                    {{ numUsersNotEligible$({ num: ineligibleUsersCount }) }}
                  </div>
                  <div class="info-line">{{ usersInClassNotAffected$() }}</div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="info-lines">
                <div class="info-line">{{ usersInClassNotAffected$() }}</div>
              </div>
            </template>
          </div>

          <h2>{{ selectClassesLabel$() }}</h2>
          <SelectableList
            v-model="selectedClasses"
            :options="formattedClasses"
            aria-labelledby="classes-heading"
            :selectAllLabel="assignToAllClasses$()"
            :searchLabel="searchForAClass$()"
          />
        </div>
      </div>
      <template #bottomNavigation>
        <div class="bottom-nav-container">
          <KButtonGroup>
            <KButton
              :text="coreStrings.cancelAction$()"
              :disabled="isLoading"
              @click="closeSidePanel"
            />
            <KButton
              primary
              :text="assignAction$()"
              :disabled="!hasSelectedClasses || isLoading || !selectedUsers.size"
              @click="handleAssign"
            />
          </KButtonGroup>
        </div>
      </template>

      <CloseConfirmationGuard
        ref="closeConfirmationGuardRef"
        reverseActionsOrder
        :hasUnsavedChanges="hasUnsavedChanges"
        :title="discardChanges$()"
        :submitText="discardAction$()"
        :cancelText="keepEditingAction$()"
      >
        <KIcon
          icon="infoOutline"
          :color="$themePalette.red.v_600"
        />
        <span :style="{ color: $themePalette.red.v_600 }">
          {{ discardWarning$() }}
        </span>
      </CloseConfirmationGuard>
    </SidePanelModal>
  </div>

</template>


<script>

  import { ref, computed } from 'vue';
  import { useRoute } from 'vue-router/composables';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import KIcon from 'kolibri-design-system/lib/KIcon';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import { UserKinds } from 'kolibri/constants';
  import RoleResource from 'kolibri-common/apiResources/RoleResource';
  import { useGoBack } from 'kolibri-common/composables/usePreviousRoute';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import flatMap from 'lodash/flatMap';
  import CloseConfirmationGuard from '../common/CloseConfirmationGuard.vue';
  import { getRootRouteName, overrideRoute } from '../../../utils';
  import SelectableList from '../../common/SelectableList.vue';
  import { _userState } from '../../../modules/mappers';
  import useActionWithUndo from '../../../composables/useActionWithUndo';

  export default {
    name: 'AssignCoachesSidePanel',
    components: {
      SidePanelModal,
      KIcon,
      SelectableList,
      CloseConfirmationGuard,
    },
    setup(props) {
      const selectedClasses = ref([]); // Array of selected class IDs
      const isLoading = ref(false);
      const showErrorWarning = ref(false);
      const createdRoles = ref(null);
      const facilityUsers = ref([]);
      const route = useRoute();
      const closeConfirmationGuardRef = ref(null);

      const goBack = useGoBack({
        getFallbackRoute: () => {
          return overrideRoute(route, {
            name: getRootRouteName(route),
          });
        },
      });

      const {
        coachesAssignedNotice$,
        assignCoachUndoneNotice$,
        usersInClassNotAffected$,
        assignAction$,
        searchForAClass$,
        defaultErrorMessage$,
        discardAction$,
        discardWarning$,
        keepEditingAction$,
        discardChanges$,
        numUsersNotEligible$,
        selectClassesLabel$,
        assignUsersHeading$,
        assignToAllClasses$,
      } = bulkUserManagementStrings;

      const loadUsers = async () => {
        isLoading.value = true;
        const users = await FacilityUserResource.fetchCollection({
          getParams: {
            by_ids: Array.from(props.selectedUsers).join(','),
          },
        });
        facilityUsers.value = users.map(_userState);
        isLoading.value = false;
      };
      loadUsers();

      // Computed properties
      const formattedClasses = computed(() => {
        return [...props.classes]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(({ id, name }) => ({ id, label: name }));
      });

      const selectedUsersCount = computed(() => props.selectedUsers.size);

      const hasSelectedClasses = computed(() => selectedClasses.value.length > 0);

      const hasUnsavedChanges = computed(() => {
        if (createdRoles.value) {
          return false;
        }
        return selectedClasses.value.length > 0;
      });

      // Filter eligible users (coaches, admins, superusers)
      const eligibleUsers = computed(() => {
        return facilityUsers.value.filter(
          user =>
            user.kind.includes(UserKinds.COACH) ||
            user.kind === UserKinds.ADMIN ||
            user.kind === UserKinds.SUPERUSER ||
            user.is_superuser,
        );
      });

      // Filter ineligible users (learners)
      const ineligibleUsers = computed(() => {
        return facilityUsers.value.filter(user => user.kind === UserKinds.LEARNER);
      });
      const ineligibleUsersCount = computed(() => ineligibleUsers.value.length);

      // Methods
      async function _handleAssign() {
        isLoading.value = true;
        showErrorWarning.value = false;

        try {
          await assignCoachesToClasses();
          closeSidePanel();
          return true;
        } catch (error) {
          showErrorWarning.value = true;
          isLoading.value = false;
          return false;
        }
      }

      async function assignCoachesToClasses() {
        const selectedClassObjects = props.classes.filter(cls =>
          selectedClasses.value.includes(cls.id),
        );
        const eligibleUserIds = eligibleUsers.value.map(user => user.id);

        if (selectedClassObjects.length === 0) {
          throw new Error('No classes selected');
        }

        const roleData = flatMap(selectedClassObjects, classObj =>
          eligibleUserIds.map(userId => ({
            collection: classObj.id,
            user: userId,
            kind: UserKinds.COACH,
          })),
        );

        const newRoles = await RoleResource.saveCollection({
          data: roleData,
        });

        // Only add roles that were actually created (have an id)
        const actuallyCreatedRoles = newRoles.filter(role => role.id);
        createdRoles.value = actuallyCreatedRoles;
      }

      async function handleUndoAssignments() {
        if (createdRoles.value.length > 0) {
          const roleIds = createdRoles.value.map(role => role.id);
          await RoleResource.deleteCollection({ by_ids: roleIds });
        }
      }

      const { performAction: handleAssign } = useActionWithUndo({
        action: _handleAssign,
        actionNotice$: coachesAssignedNotice$,
        undoAction: handleUndoAssignments,
        undoActionNotice$: assignCoachUndoneNotice$,
        onBlur: props.onBlur,
      });

      function closeSidePanel() {
        goBack();
      }

      return {
        coreStrings,
        selectedClasses,
        isLoading,
        formattedClasses,
        selectedUsersCount,
        hasSelectedClasses,
        hasUnsavedChanges,
        ineligibleUsersCount,
        showErrorWarning,
        defaultErrorMessage$,
        usersInClassNotAffected$,
        assignAction$,
        searchForAClass$,
        selectClassesLabel$,
        handleAssign,
        closeSidePanel,
        discardAction$,
        discardWarning$,
        keepEditingAction$,
        discardChanges$,
        numUsersNotEligible$,
        assignUsersHeading$,
        assignToAllClasses$,
        closeConfirmationGuardRef,
      };
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      selectedUsers: {
        type: Set,
        default: () => new Set(),
      },
      /* eslint-enable vue/no-unused-properties */
      classes: {
        type: Array,
        default: () => [],
      },
      onBlur: {
        type: Function,
        default: () => {},
      },
    },
    beforeRouteLeave(to, from, next) {
      this.$refs.closeConfirmationGuardRef?.beforeRouteLeave(to, from, next);
    },
  };

</script>


<style scoped>

  .assign-coaches-content {
    position: relative;
  }

  .assign-warning-label {
    margin-bottom: 10px;
  }

  .bottom-nav-container {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }

  .adjust-line-height {
    /* Override default global line-height of 1.15 to prevent
       scrollbars in KModal and add space for single-line content */
    line-height: 1.5;
  }

  .top-info-box {
    padding: 12px;
    margin-bottom: 16px;
    border-radius: 8px;
  }
  /* stylelint-disable-next-line selector-pseudo-element-no-unknown */
  ::v-deep(.side-panel-content) {
    padding-top: 0 !important ;
  }
  /* stylelint-disable-next-line selector-pseudo-element-no-unknown */
  ::v-deep(.side-panel-header) {
    padding-right: 32px !important ;
    padding-left: 32px !important ;
  }

  .info-flex {
    display: flex;
    align-items: flex-start;
  }

  .info-icon {
    flex: 0 0 24px;
    width: 24px;
    height: 24px;
    margin-right: 4px;
  }

  .info-lines {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-line {
    line-height: 1.4;
  }

  .info-line:last-child {
    margin-bottom: 0;
  }

</style>
