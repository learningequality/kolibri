<template>

  <div>
    <SidePanelModal
      alignment="right"
      sidePanelWidth="700px"
      @closePanel="closeSidePanel"
    >
      <template #header>
        <h1>{{ enrollToClass$() }}</h1>
      </template>
      <KCircularLoader v-if="loading" />
      <div v-else>
        <div
          v-if="showErrorWarning"
          class="enroll-warning-label"
          :style="{ color: $themeTokens.error }"
        >
          <span>{{ defaultErrorMessage$() }}</span>
        </div>
        <div class="enroll-warning-label">
          <span>{{ numUsersYouHaveSelected$({ num: selectedUsers.size }) }}</span>
        </div>
        <div
          v-if="usersNotEnrolled > 0"
          class="enroll-warning-label"
        >
          <KIcon
            icon="warningIncomplete"
            class="enroll-warning-icon"
          />
          <span>{{ numUsersNotEnrolled$({ num: usersNotEnrolled }) }}</span>
        </div>
        <div
          v-if="classCoaches.length > 0"
          class="enroll-warning-label"
        >
          <KIcon
            icon="warningIncomplete"
            class="enroll-warning-icon"
          />
          <span>{{ numUsersCoaches$({ num: classCoaches.length }) }}</span>
        </div>
        <div
          v-if="selectedUsers.size > 0"
          class="enroll-warning-label"
        >
          <KIcon
            icon="info"
            :color="$themePalette.orange.v_400"
            class="enroll-warning-icon"
          />
          <span>{{ usersInClassNotAffected$() }}</span>
        </div>
        <h2 id="enroll-in-selected-classes">{{ enrollInSelectedClasses$() }}</h2>
        <SelectableList
          v-model="selectedOptions"
          :options="classList"
          :selectAllLabel="enrollInAllClasses$()"
          aria-labelledby="enroll-in-selected-classes"
          :searchLabel="searchForAClass$()"
        />
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
  import { ref, computed } from 'vue';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { useGoBack } from 'kolibri-common/composables/usePreviousRoute';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import MembershipResource from 'kolibri-common/apiResources/MembershipResource';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import { UserKinds } from 'kolibri/constants';
  import groupBy from 'lodash/groupBy';
  import SelectableList from '../../common/SelectableList.vue';
  import useActionWithUndo from '../../../composables/useActionWithUndo';
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
      const showErrorWarning = ref(false);
      const selectedOptions = ref([]);
      const classCoaches = ref([]);
      const classLearners = ref([]);
      const loading = ref(false);
      const membershipsByUser = ref({});
      const createdMemberships = ref(null);

      const {
        enrollToClass$,
        numUsersNotEnrolled$,
        usersInClassNotAffected$,
        numUsersCoaches$,
        searchForAClass$,
        enrollInAllClasses$,
        enrollInSelectedClasses$,
        numUsersYouHaveSelected$,
        enrollUndoneNotice$,
        enrollAction$,
        discardAction$,
        discardWarning$,
        keepEditingAction$,
        discardChanges$,
        defaultErrorMessage$,
        usersEnrolledNotice$,
      } = bulkUserManagementStrings;

      const route = useRoute();
      const goBack = useGoBack({
        getFallbackRoute: () => {
          return overrideRoute(route, {
            name: getRootRouteName(route),
          });
        },
      });

      // Computed properties
      const classList = computed(() =>
        props.classes
          .map(classObj => ({
            label: classObj.name,
            id: classObj.id,
          }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );

      const usersNotEnrolled = computed(() => {
        const enrolledUsers = new Set(classLearners.value);
        return [...props.selectedUsers].filter(userId => !enrolledUsers.has(userId)).length;
      });

      const hasUnsavedChanges = computed(() => {
        if (createdMemberships.value) {
          return false;
        }
        return selectedOptions.value.length > 0;
      });

      // Methods
      async function setClassUsers() {
        classLearners.value = [];
        classCoaches.value = [];
        loading.value = true;
        const membershipsPromise = MembershipResource.fetchCollection({
          getParams: { user_ids: Array.from(props.selectedUsers).join(',') },
          force: true,
        });
        const userModelsPromise = FacilityUserResource.fetchCollection({
          getParams: {
            by_ids: Array.from(props.selectedUsers).join(','),
          },
          force: true,
        });
        try {
          const [membershipsData, userModels] = await Promise.all([
            membershipsPromise,
            userModelsPromise,
          ]);
          membershipsByUser.value = groupBy(membershipsData, 'user');
          classLearners.value = Object.keys(membershipsByUser.value);
          classCoaches.value = Array.from(
            userModels
              .filter(user => user.roles.some(role => role.kind.includes(UserKinds.COACH)))
              .reduce((set, user) => set.add(user.id), new Set()),
          );
        } finally {
          loading.value = false;
        }
      }

      async function _enrollLearners() {
        loading.value = true;
        const enrollments = selectedOptions.value.flatMap(collection_id => {
          const alreadyEnrolled = membershipsByUser.value;
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
            showErrorWarning.value = true;
            loading.value = false;
            return false;
          }
        } else {
          // Setting an empty array to flag that the operation was successful and no users
          // were enrolled
          createdMemberships.value = [];
        }
        goBack();
        return true;
      }

      const { performAction: enrollLearners } = useActionWithUndo({
        action: _enrollLearners,
        actionNotice$: usersEnrolledNotice$,
        undoAction: handleUndoEnrollments,
        undoActionNotice$: enrollUndoneNotice$,
        onBlur: props.onBlur,
      });

      function closeSidePanel() {
        goBack();
      }

      async function handleUndoEnrollments() {
        if (createdMemberships.value?.length > 0) {
          const ids = createdMemberships.value.map(m => m.id).join(',');
          await MembershipResource.deleteCollection({ by_ids: ids });
        }
      }

      return {
        enrollToClass$,
        numUsersNotEnrolled$,
        usersInClassNotAffected$,
        numUsersCoaches$,
        searchForAClass$,
        enrollInAllClasses$,
        enrollInSelectedClasses$,
        numUsersYouHaveSelected$,
        defaultErrorMessage$,
        enrollAction$,
        discardAction$,
        discardWarning$,
        keepEditingAction$,
        discardChanges$,
        showErrorWarning,
        selectedOptions,
        classCoaches,
        loading,
        classList,
        usersNotEnrolled,
        hasUnsavedChanges,
        setClassUsers,
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
    },
    beforeRouteLeave(to, from, next) {
      this.$refs.closeConfirmationGuardRef?.beforeRouteLeave(to, from, next);
    },
    created() {
      this.setClassUsers();
    },
  };

</script>


<style lang="scss" scoped>

  .enroll-warning-icon {
    position: relative;
    top: 0.4em;
    width: 1.5em;
    height: 1.5em;
    margin-right: 0.5em;
  }

  .enroll-warning-label {
    margin-bottom: 10px;
  }

  .bottom-nav-container {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }

  .adjust-line-height {
    // Override default global line-height of 1.15 to prevent
    // scrollbars in KModal and add space for single-line content
    line-height: 1.5;
  }

</style>
