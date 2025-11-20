<template>

  <div>
    <SidePanelModal
      hideHeaderBorder
      alignment="right"
      sidePanelWidth="700px"
      :contentContainerStyleOverrides="{ padding: '0px 24px 24px' }"
      class="bum-side-panel"
      :headerContainerStyleOverrides="{ paddingLeft: '24px', paddingRight: '24px' }"
      @closePanel="closeSidePanel"
    >
      <template #header>
        <h1 class="side-panel-title">
          {{ enrollUsersInClasses$({ num: selectedUsers.size }) }}
        </h1>
      </template>
      <div class="side-panel-content">
        <KCircularLoader v-if="loading" />
        <div v-else>
          <div
            v-if="showErrorWarning"
            :style="{ color: $themeTokens.error }"
            class="warning-text"
          >
            <span>{{ defaultErrorMessage$() }}</span>
          </div>
          <div
            v-if="numCoachesSelected > 0"
            class="info-box"
            :style="{ backgroundColor: $themePalette.grey.v_100 }"
          >
            <div style="display: flex">
              <KIcon
                icon="infoOutline"
                class="info-icon"
              />
              <div class="info-wrapper">
                <span>{{ coachesToEnroll$({ num: numCoachesSelected }) }}</span>
              </div>
            </div>
          </div>
          <h2
            id="enroll-in-selected-classes"
            class="side-panel-subtitle"
          >
            {{ selectClassesLabel$() }}
          </h2>
          <SelectableList
            v-if="classList.length"
            v-model="selectedOptions"
            :options="classList"
            :selectAllLabel="enrollInAllClasses$()"
            aria-labelledby="enroll-in-selected-classes"
            :searchLabel="searchForAClass$()"
          />
          <p v-else>
            {{ noClassesInFacilityNotice$() }}
            <KRouterLink
              :text="classesLabel$()"
              :to="$store.getters.facilityPageLinks.ManageClassPage"
            />
          </p>
        </div>
      </div>
      <template #bottomNavigation>
        <div class="bottom-nav-container">
          <KButtonGroup>
            <KButton
              :text="coreString('cancelAction')"
              :disabled="loading"
              @click="closeSidePanel"
            />
            <KButton
              primary
              :text="enrollAction$()"
              :disabled="!selectedOptions.length || loading || !selectedUsers.size"
              @click="enrollLearners"
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

  import { useRoute } from 'vue-router/composables';
  import { getCurrentInstance, ref, computed } from 'vue';
  import { UserKinds } from 'kolibri/constants';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import commonCoreStrings, { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { useGoBack } from 'kolibri-common/composables/usePreviousRoute';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import MembershipResource from 'kolibri-common/apiResources/MembershipResource';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import groupBy from 'lodash/groupBy';
  import { _userState } from '../../../modules/mappers';
  import SelectableList from '../../common/SelectableList.vue';
  import useActionWithUndo from '../../../composables/useActionWithUndo';
  import { PageNames } from '../../../constants.js';
  import { getRootRouteName, overrideRoute } from '../../../utils';
  import CloseConfirmationGuard from '../common/CloseConfirmationGuard.vue';

  export default {
    name: 'EnrollLearnersSidePanel',
    components: {
      SidePanelModal,
      SelectableList,
      CloseConfirmationGuard,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const store = getCurrentInstance().proxy.$store;
      const route = useRoute();
      const goBack = useGoBack({
        getFallbackRoute: () => {
          return overrideRoute(route, {
            name: getRootRouteName(route),
          });
        },
      });

      const loading = ref(false);
      const showErrorWarning = ref(false);
      const facilityUsers = ref([]);
      const selectedOptions = ref([]);
      const classLearners = ref([]);
      const classMembershipsByUser = ref({});
      const createdMemberships = ref(null);
      const {
        enrollAction$,
        discardAction$,
        discardWarning$,
        discardChanges$,
        searchForAClass$,
        actionSuccessful$,
        keepEditingAction$,
        selectClassesLabel$,
        enrollInAllClasses$,
        usersEnrolledNotice$,
        defaultErrorMessage$,
        enrollUsersInClasses$,
        noClassesInFacilityNotice$,
        coachesToEnroll$,
      } = bulkUserManagementStrings;

      const { classesLabel$ } = coreStrings;

      const loadUsers = async () => {
        if (!props.selectedUsers || props.selectedUsers.size === 0) {
          facilityUsers.value = [];
          return;
        }
        loading.value = true;
        const users = await FacilityUserResource.fetchCollection({
          getParams: {
            by_ids: Array.from(props.selectedUsers).join(','),
          },
        });
        facilityUsers.value = users.map(_userState);
        loading.value = false;
      };
      loadUsers();

      // Computed properties
      const classList = computed(() =>
        props.classes
          .map(classObj => ({
            label: classObj.name,
            id: classObj.id,
          }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );

      const numCoachesSelected = computed(() => {
        if (!facilityUsers.value?.length) {
          return 0;
        }
        return [...props.selectedUsers].filter(userId => {
          const user = facilityUsers.value.find(u => u.id === userId);
          if (!user) return false;
          return (
            user.kind.includes(UserKinds.COACH) ||
            user.kind === UserKinds.ADMIN ||
            user.kind === UserKinds.SUPERUSER ||
            user.is_superuser
          );
        }).length;
      });

      const hasUnsavedChanges = computed(() => {
        if (createdMemberships.value) {
          return false;
        }
        return selectedOptions.value.length > 0;
      });

      // Methods
      async function setClassUsers() {
        loading.value = true;
        try {
          const classMemberships = await MembershipResource.fetchCollection({
            getParams: { user_ids: Array.from(props.selectedUsers).join(',') },
            force: true,
          });
          classMembershipsByUser.value = groupBy(classMemberships, 'user');
          classLearners.value = Object.keys(classMembershipsByUser.value);
        } finally {
          loading.value = false;
        }
      }
      setClassUsers();

      async function _enrollLearners() {
        loading.value = true;
        const enrollments = selectedOptions.value.flatMap(collection_id => {
          const alreadyEnrolled = classMembershipsByUser.value;
          return Array.from(props.selectedUsers)
            .filter(
              userId => !(alreadyEnrolled[userId] || []).some(m => m.collection === collection_id),
            )
            .map(user => ({ collection: collection_id, user }));
        });
        if (enrollments.length > 0) {
          try {
            const newMemberships = await MembershipResource.saveCollection({ data: enrollments });
            createdMemberships.value = newMemberships;
          } catch (error) {
            store.dispatch('handleApiError', { error });
            loading.value = false;
            return false;
          }
        } else {
          // Setting an empty array to flag that the operation was successful and no users
          // were enrolled
          createdMemberships.value = [];
        }
        props.onChange({
          affectedClasses: selectedOptions.value,
          resetSelection: true,
        });
        goBack();
        return true;
      }

      const { performAction: enrollLearners } = useActionWithUndo({
        action: _enrollLearners,
        actionNotice$: usersEnrolledNotice$,
        undoAction: handleUndoEnrollments,
        undoActionNotice$: actionSuccessful$,
        onBlur: props.onBlur,
      });

      function closeSidePanel() {
        goBack();
      }

      async function handleUndoEnrollments() {
        if (createdMemberships.value?.length > 0) {
          const ids = createdMemberships.value.map(m => m.id).join(',');
          await MembershipResource.deleteCollection({ by_ids: ids });
          props.onChange({
            affectedClasses: selectedOptions.value,
          });
        }
      }

      return {
        // ref and computed properties
        loading,
        classList,
        selectedOptions,
        numCoachesSelected,
        showErrorWarning,
        hasUnsavedChanges,

        // translation functions
        classesLabel$,
        enrollAction$,
        discardAction$,
        discardWarning$,
        discardChanges$,
        searchForAClass$,
        keepEditingAction$,
        selectClassesLabel$,
        enrollInAllClasses$,
        defaultErrorMessage$,
        enrollUsersInClasses$,
        noClassesInFacilityNotice$,
        coachesToEnroll$,

        // methods
        enrollLearners,
        closeSidePanel,
      };
    },
    props: {
      selectedUsers: {
        type: Set,
        required: true,
      },
      classes: {
        type: Array,
        required: true,
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
