<template>

  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    @closePanel="$router.back()"
  >
    <template #header>
      <h1>Assign to class</h1>
    </template>

    <div class="assign-coaches-content">
      <KCircularLoader v-if="isLoading" />
      <div v-else>
        <div
          v-if="showErrorWarning"
          class="enroll-warning-label"
          :style="{ color: $themeTokens.error }"
        >
          <span>{{ defaultErrorMessage$() }}</span>
        </div>
        <p>You've selected {{ selectedUsersCount }} users</p>
        <div class="warning-message">
          <KIcon
            icon="warning"
            color="yellow"
            class="sidepanel-icon"
          />
          {{ selectedUsersCount }} users are not enrolled in any class
        </div>
        <div class="warning-message">
          <KIcon
            icon="warning"
            color="yellow"
            class="sidepanel-icon"
          />
          {{ selectedUsersCount }} users are coaches
        </div>
        <div class="info-message">
          <KIcon
            icon="info"
            color="orange"
            class="sidepanel-icon"
          />
          Users already not in selected classes will not be affected.
        </div>
        <hr class="divider" >
        <h2>Assign users to selected classes</h2>
        <SelectableList
          v-model="selectedClasses"
          :options="formattedClasses"
          aria-labelledby="classes-heading"
          :selectAllLabel="'Select all classes'"
          :searchLabel="'Search classes...'"
        />

        <!-- Footer Buttons -->
        <div class="footer-buttons">
          <KButton
            appearance="secondary-button"
            @click="handleCancel"
          >
            Cancel
          </KButton>
          <KButton
            primary
            appearance="raised-button"
            :disabled="!hasSelectedClasses || isLoading"
            @click="handleEnroll"
          >
            {{ 'Enroll' }}
          </KButton>
        </div>
      </div>
    </div>
  </SidePanelModal>

</template>


<script>

  import { ref, computed, getCurrentInstance } from 'vue';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import KIcon from 'kolibri-design-system/lib/KIcon';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import { UserKinds } from 'kolibri/constants';
  import RoleResource from 'kolibri-common/apiResources/RoleResource';
  import SelectableList from '../../ManageClassPage/SelectableList';

  export default {
    name: 'AssignCoachesSidePanel',
    components: {
      SidePanelModal,
      KIcon,
      SelectableList,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const selectedClasses = ref([]); // Array of selected class IDs
      const isLoading = ref(false);
      const showErrorWarning = ref(false);
      const instance = getCurrentInstance();

      const { defaultErrorMessage$ } = bulkUserManagementStrings;

      // Computed properties
      const formattedClasses = computed(() =>
        props.classes.map(cls => ({
          id: cls.id,
          label: cls.name,
        })),
      );

      const selectedUsersCount = computed(() => props.selectedUsers.size);

      const hasSelectedClasses = computed(() => selectedClasses.value.length > 0);

      const getSelectedClassObjects = computed(() =>
        props.classes.filter(cls => selectedClasses.value.includes(cls.id)),
      );

      // Methods
      async function handleEnroll() {
        if (!hasSelectedClasses.value) {
          return;
        }

        isLoading.value = true;
        showErrorWarning.value = false;

        try {
          await assignCoachesToClasses();
          instance.proxy.$router.back();
        } catch (error) {
          showErrorWarning.value = true;
        } finally {
          isLoading.value = false;
        }
      }

      async function assignCoachesToClasses() {
        const selectedClasses = getSelectedClassObjects.value;
        const userIds = Array.from(props.selectedUsers);

        for (const classObj of selectedClasses) {
          try {
            // First, get existing coaches for this class
            const existingRoles = await RoleResource.fetchCollection({
              getParams: {
                collection: classObj.id,
                kind: UserKinds.COACH,
              },
            });
            // Filter out users who are already coaches
            const existingCoachIds = new Set(existingRoles.map(role => role.user));
            const newCoachIds = userIds.filter(userId => !existingCoachIds.has(userId));

            if (newCoachIds.length === 0) {
              console.log(`All selected users are already coaches for class: ${classObj.name}`);
              continue;
            }

            // Only assign new coaches
            await RoleResource.saveCollection({
              data: newCoachIds.map(userId => ({
                collection: classObj.id,
                user: userId,
                kind: UserKinds.COACH,
              })),
            });
          } catch (error) {
            console.error(`Failed to assign coaches to class ${classObj.id} (${classObj.name}):`, error);
            throw error;
          }
        }
      }



      function handleCancel() {
        instance.proxy.$router.back();
      }

      return {
        selectedClasses,
        isLoading,
        formattedClasses,
        selectedUsersCount,
        hasSelectedClasses,
        showErrorWarning,
        defaultErrorMessage$,
        handleEnroll,
        handleCancel,
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
    },
  };

</script>


<style scoped>

  .assign-coaches-content {
    position: relative;
  }

  .enroll-warning-label {
    margin-bottom: 10px;
  }

  .warning-message {
    display: flex;
    align-items: center;
  }

  .warning-icon {
    margin-right: 4px;
  }

  .info-message {
    display: flex;
    align-items: center;
  }

  .info-icon {
    margin-right: 4px;
  }

  .sidepanel-icon {
    padding-right: 8px;
    padding-left: 8px;
    font-size: 32px;
  }

  .divider {
    margin: 16px 0 0;
    border-top: 2px solid #f0f0f0;
  }

  .footer-buttons {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding-top: 16px;
    margin-top: 24px;
    border-top: 1px solid #eeeeee;
  }

</style>
