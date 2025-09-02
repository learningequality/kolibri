<template>

  <div>
    <SidePanelModal
      alignment="right"
      sidePanelWidth="700px"
      :addBottomBorder="false"
      @closePanel="closeSidePanel"
    >
      <template #header>
        <h1 style="font-size: 20px">
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
            class="info-box"
            :style="{ backgroundColor: $themePalette.grey.v_100 }"
          >
            <div style="display: flex">
              <KIcon
                icon="infoOutline"
                class="enroll-info-icon"
              />
              <template v-if="usersNotEnrolled > 0">
                <div class="info-wrapper">
                  <span>
                    {{ numUsersNotEnrolled$({ num: usersNotEnrolled }) }}
                  </span>
                  <span>{{ usersInClassNotAffected$() }}</span>
                </div>
              </template>
              <template v-else>
                <div class="info-wrapper">
                  <span>{{ usersInClassNotAffected$() }}</span>
                </div>
              </template>
            </div>
          </div>
          <h2
            id="enroll-in-selected-classes"
            style="font-size: 16px"
          >
            {{ SelectClassesLabel$() }}
          </h2>
          <SelectableList
            v-model="selectedOptions"
            :options="classList"
            :selectAllLabel="enrollInAllClasses$()"
            aria-labelledby="enroll-in-selected-classes"
            :searchLabel="searchForAClass$()"
          />
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
  import { ref, computed, onMounted } from 'vue';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { useGoBack } from 'kolibri-common/composables/usePreviousRoute';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import MembershipResource from 'kolibri-common/apiResources/MembershipResource';
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
      const loading = ref(false);
      const showErrorWarning = ref(false);
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
        keepEditingAction$,
        SelectClassesLabel$,
        enrollUndoneNotice$,
        enrollInAllClasses$,
        usersEnrolledNotice$,
        defaultErrorMessage$,
        numUsersNotEnrolled$,
        enrollUsersInClasses$,
        usersInClassNotAffected$,
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
        loading.value = true;
        try {
          const classMemberships = await MembershipResource.fetchCollection({
            getParams: { user_ids: Array.from(props.selectedUsers).join(',') },
          });
          classMembershipsByUser.value = groupBy(classMemberships, 'user');
          classLearners.value = Object.keys(classMembershipsByUser.value);
        } finally {
          loading.value = false;
        }
      }

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

      onMounted(() => {
        setClassUsers();
      });

      return {
        // ref and computed properties
        loading,
        classList,
        selectedOptions,
        usersNotEnrolled,
        showErrorWarning,
        hasUnsavedChanges,

        // translation functions
        enrollAction$,
        discardAction$,
        discardWarning$,
        discardChanges$,
        searchForAClass$,
        keepEditingAction$,
        SelectClassesLabel$,
        enrollInAllClasses$,
        defaultErrorMessage$,
        numUsersNotEnrolled$,
        enrollUsersInClasses$,
        usersInClassNotAffected$,

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
    },
    beforeRouteLeave(to, from, next) {
      this.$refs.closeConfirmationGuardRef?.beforeRouteLeave(to, from, next);
    },
  };

</script>


<style lang="scss" scoped>

  .side-panel-content {
    position: relative;
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

  .info-box {
    padding: 8px;
    border-radius: 4px;
  }

  .enroll-info-icon {
    flex: 0 0 22px;
    width: 22px;
    height: 22px;
    margin-right: 4px;
  }

  .info-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 2px;
    line-height: 1.4;
  }

  .warning-text {
    margin-bottom: 10px;
    margin-left: 5px;
  }

  .bottom-nav-container {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }

</style>
