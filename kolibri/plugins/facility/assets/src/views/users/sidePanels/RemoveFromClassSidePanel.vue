<template>

  <div>
    <SidePanelModal
      alignment="right"
      sidePanelWidth="700px"
      :addBottomBorder="false"
      @closePanel="goBack"
    >
      <template #header>
        <h1 style="font-size: 20px">
          {{ removeUsersFromClassesHeading$({ numUsers: selectedUsers.size }) }}
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
                class="remove-info-icon"
              />
              <template v-if="selectedUsers.size > 0 && classCoaches.length > 0">
                <div class="info-wrapper">
                  <span>
                    {{ numUsersCoaches$({ num: classCoaches.length }) }}
                  </span>
                  <span>{{ usersNotInClasses$() }}</span>
                </div>
              </template>
              <template v-else>
                <div class="info-wrapper">
                  <span>{{ usersNotInClasses$() }}</span>
                </div>
              </template>
            </div>
          </div>
          <h2
            id="remove-from-selected-classes"
            style="font-size: 16px"
          >
            {{ SelectClassesLabel$() }}
          </h2>
          <SelectableList
            v-model="selectedOptions"
            :options="classList"
            :selectAllLabel="removeFromAllClassesLabel$()"
            aria-labelledby="remove-from-selected-classes"
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
              @click="goBack"
            />
            <KButton
              primary
              :text="removeAction$()"
              :disabled="!selectedOptions.length || loading || !selectedUsers.size"
              @click="removeUsers"
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

  import { ref, computed, onMounted } from 'vue';
  import { useRoute } from 'vue-router/composables';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import MembershipResource from 'kolibri-common/apiResources/MembershipResource';
  import RoleResource from 'kolibri-common/apiResources/RoleResource';
  import { UserKinds } from 'kolibri/constants';
  import groupBy from 'lodash/groupBy';
  import { useGoBack } from 'kolibri-common/composables/usePreviousRoute';
  import SelectableList from '../../common/SelectableList.vue';
  import { getRootRouteName, overrideRoute } from '../../../utils';
  import useActionWithUndo from '../../../composables/useActionWithUndo';
  import CloseConfirmationGuard from '../common/CloseConfirmationGuard.vue';

  export default {
    name: 'RemoveFromClassSidePanel',
    components: {
      SidePanelModal,
      SelectableList,
      CloseConfirmationGuard,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const closeConfirmationGuardRef = ref(null);
      const showErrorWarning = ref(false);
      const selectedOptions = ref([]);
      const classCoaches = ref([]);
      const loading = ref(false);
      const membershipsByUser = ref({});
      const rolesByUser = ref({});
      const removedLearnerMemberships = ref([]);
      const removedCoachRoles = ref([]);
      const route = useRoute();
      const {
        numUsersCoaches$,
        searchForAClass$,
        discardAction$,
        discardWarning$,
        keepEditingAction$,
        discardChanges$,
        defaultErrorMessage$,
        removeUsersFromClassesHeading$,
        usersNotInClasses$,
        removeFromAllClassesLabel$,
        SelectClassesLabel$,
        removeAction$,
        usersRemovedNotice$,
        undoUsersRemovedMessage$,
      } = bulkUserManagementStrings;

      const goBack = useGoBack({
        getFallbackRoute: () => {
          return overrideRoute(route, {
            name: getRootRouteName(route),
          });
        },
      });

      // computed properties
      const classList = computed(() => {
        // Get all class IDs where selected users are enrolled as learners
        const learnerClassIds = Object.values(membershipsByUser.value || {})
          .flat()
          .filter(membership => membership && membership.collection)
          .map(membership => membership.collection);

        // Get all class IDs where selected users are coaches
        const coachClassIds = Object.values(rolesByUser.value || {})
          .flat()
          .filter(role => role && role.collection)
          .map(role => role.collection);

        // Combine and deduplicate class IDs
        const uniqueClassIds = new Set([...learnerClassIds, ...coachClassIds]);

        return props.classes
          .filter(classObj => uniqueClassIds.has(classObj.id))
          .map(classObj => ({
            label: classObj.name,
            id: classObj.id,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
      });

      const hasRemovedLearners = computed(() => {
        return removedLearnerMemberships.value.length > 0;
      });

      const hasRemovedCoaches = computed(() => {
        return removedCoachRoles.value.length > 0;
      });

      const hasUnsavedChanges = computed(() => {
        if (hasRemovedLearners.value || hasRemovedCoaches.value) {
          return false;
        }
        return selectedOptions.value.length > 0;
      });

      // methods
      async function setClassUsers() {
        loading.value = true;
        try {
          const userIds = Array.from(props.selectedUsers);
          const userIdsStr = userIds.join(',');

          const [membershipsData, coachRoles] = await Promise.all([
            MembershipResource.fetchCollection({
              getParams: { user_ids: userIdsStr },
              force: true,
            }),
            RoleResource.fetchCollection({
              getParams: {
                user_ids: userIdsStr,
                kind: UserKinds.COACH,
              },
              force: true,
            }),
          ]);

          membershipsByUser.value = groupBy(membershipsData, 'user');
          rolesByUser.value = groupBy(coachRoles, 'user');
          classCoaches.value = Object.keys(rolesByUser.value);
        } catch (error) {
          showErrorWarning.value = true;
        } finally {
          loading.value = false;
        }
      }

      async function undoUserRemoval() {
        const enrollments = hasRemovedLearners.value
          ? removedLearnerMemberships.value.map(({ collection, user }) => ({
            collection,
            user,
          }))
          : [];
        const assignments = hasRemovedCoaches.value
          ? removedCoachRoles.value.map(({ collection, user }) => ({
            collection,
            user,
            kind: UserKinds.COACH,
          }))
          : [];
        await Promise.all([
          enrollments.length
            ? MembershipResource.saveCollection({ data: enrollments })
            : Promise.resolve(),
          assignments.length
            ? RoleResource.saveCollection({ data: assignments })
            : Promise.resolve(),
        ]);
      }

      function getItemsToRemove(byUser, selectedSet) {
        return Object.values(byUser.value)
          .flat()
          .filter(item => selectedSet.has(item.collection) && item.id);
      }

      async function _removeUsers() {
        loading.value = true;
        // selected classes to remove users from
        const selectedSet = new Set(selectedOptions.value);
        const learnerMembershipsToRemove = getItemsToRemove(membershipsByUser, selectedSet);
        const coachRolesToRemove = getItemsToRemove(rolesByUser, selectedSet);

        async function removeItems(resource, items) {
          if (items.length) {
            const ids = items.map(item => item.id).join(',');
            await resource.deleteCollection({ by_ids: ids });
          }
        }
        try {
          await removeItems(MembershipResource, learnerMembershipsToRemove);
          await removeItems(RoleResource, coachRolesToRemove);
          removedLearnerMemberships.value = learnerMembershipsToRemove || [];
          removedCoachRoles.value = coachRolesToRemove || [];
          goBack();
          return true;
        } catch (error) {
          showErrorWarning.value = true;
          loading.value = false;
          return false;
        }
      }

      const { performAction: removeUsers } = useActionWithUndo({
        action: _removeUsers,
        actionNotice$: usersRemovedNotice$,
        undoAction: undoUserRemoval,
        undoActionNotice$: undoUsersRemovedMessage$,
        onBlur: props.onBlur,
      });

      onMounted(() => {
        setClassUsers();
      });

      return {
        // ref and computed properties
        closeConfirmationGuardRef,
        hasUnsavedChanges,
        showErrorWarning,
        selectedOptions,
        classCoaches,
        loading,
        classList,

        // translation functions
        removeUsersFromClassesHeading$,
        numUsersCoaches$,
        searchForAClass$,
        defaultErrorMessage$,
        discardAction$,
        discardWarning$,
        keepEditingAction$,
        discardChanges$,
        usersNotInClasses$,
        removeFromAllClassesLabel$,
        SelectClassesLabel$,
        removeAction$,

        // methods
        removeUsers,
        goBack,
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

  .remove-info-icon {
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
