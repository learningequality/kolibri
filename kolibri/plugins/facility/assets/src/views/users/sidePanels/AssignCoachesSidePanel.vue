<template>

  <div>
    <SidePanelModal
      hideHeaderBorder
      alignment="right"
      sidePanelWidth="700px"
      class="bum-side-panel"
      :contentContainerStyleOverrides="{ padding: '0px 24px 24px' }"
      :headerContainerStyleOverrides="{ paddingLeft: '24px', paddingRight: '24px' }"
      @closePanel="closeSidePanel"
    >
      <template #header>
        <h1 class="side-panel-title">{{ assignUsersHeading$({ num: eligibleUsersCount }) }}</h1>
      </template>

      <div class="assign-coaches-content">
        <KCircularLoader v-if="isLoading" />
        <div v-else>
          <div
            v-if="showErrorWarning"
            class="warning-text"
            :style="{ color: $themeTokens.error }"
          >
            <span>{{ defaultErrorMessage$() }}</span>
          </div>

          <div
            v-if="ineligibleUsersCount > 0"
            class="info-box"
            :style="{ backgroundColor: $themePalette.grey.v_100 }"
          >
            <div style="display: flex">
              <KIcon
                icon="infoOutline"
                class="info-icon"
              />
              <div class="info-wrapper">
                <template>
                  <span>
                    {{ numUsersNotEligible$({ num: ineligibleUsersCount }) }}
                  </span>
                </template>
              </div>
            </div>
          </div>

          <h2
            id="assign-coaches-selected-classes"
            class="side-panel-subtitle"
          >
            {{ selectClassesLabel$() }}
          </h2>
          <SelectableList
            v-if="formattedClasses.length"
            v-model="selectedClasses"
            :options="formattedClasses"
            aria-labelledby="assign-coaches-selected-classes"
            :selectAllLabel="assignToAllClasses$()"
            :searchLabel="searchForAClass$()"
          />
          <p v-else>
            {{ noClassesInFacilityNotice$() }}
            <KRouterLink
              :text="coreStrings.classesLabel$()"
              :to="$store.getters.facilityPageLinks.ManageClassPage"
            />
          </p>
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
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import { UserKinds } from 'kolibri/constants';
  import RoleResource from 'kolibri-common/apiResources/RoleResource';
  import { useGoBack } from 'kolibri-common/composables/usePreviousRoute';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import flatMap from 'lodash/flatMap';
  import CloseConfirmationGuard from '../common/CloseConfirmationGuard.vue';
  import { PageNames } from '../../../constants.js';
  import { getRootRouteName, overrideRoute } from '../../../utils';
  import SelectableList from '../../common/SelectableList.vue';
  import { _userState } from '../../../modules/mappers';
  import useActionWithUndo from '../../../composables/useActionWithUndo';

  export default {
    name: 'AssignCoachesSidePanel',
    components: {
      SidePanelModal,
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
        actionSuccessful$,
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
        noClassesInFacilityNotice$,
      } = bulkUserManagementStrings;

      const loadUsers = async () => {
        if (!props.selectedUsers || props.selectedUsers.size === 0) {
          facilityUsers.value = [];
          return;
        }
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
      const eligibleUsersCount = computed(() => eligibleUsers.value.length);

      // Methods
      async function _handleAssign() {
        isLoading.value = true;
        showErrorWarning.value = false;

        try {
          await assignCoachesToClasses();
          props.onChange({
            affectedClasses: selectedClasses.value,
            resetSelection: true,
          });
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
          props.onChange({
            affectedClasses: selectedClasses.value,
          });
        }
      }

      const { performAction: handleAssign } = useActionWithUndo({
        action: _handleAssign,
        actionNotice$: coachesAssignedNotice$,
        undoAction: handleUndoAssignments,
        undoActionNotice$: actionSuccessful$,
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
        hasSelectedClasses,
        hasUnsavedChanges,
        eligibleUsersCount,
        ineligibleUsersCount,
        showErrorWarning,
        defaultErrorMessage$,
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
        noClassesInFacilityNotice$,
        closeConfirmationGuardRef,
      };
    },
    props: {
      selectedUsers: {
        type: Set,
        default: () => new Set(),
      },
      classes: {
        type: Array,
        default: () => [],
      },
      onBlur: {
        type: Function,
        default: () => {},
      },
      onChange: {
        type: Function,
        default: () => {},
      },
    },
    beforeRouteEnter(to, from, next) {
      // We can't land here without having navigated to here from the users root page - we can't
      // have selected any users if we load into this page, so go to the users table.
      if (from.name === null) {
        next(
          // Override to to keep params like facility_id in place
          overrideRoute(to, {
            name: PageNames.USER_MGMT_PAGE,
          }),
        );
      }
      next();
    },
    beforeRouteLeave(to, from, next) {
      this.$refs.closeConfirmationGuardRef?.beforeRouteLeave(to, from, next);
    },
  };

</script>


<style lang="scss" scoped>

  @import './common';

  .bum-side-panel {
    @include bum-side-panel;
  }

</style>
