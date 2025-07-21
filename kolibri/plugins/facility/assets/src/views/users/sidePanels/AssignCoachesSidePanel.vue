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
      <div
        v-if="isLoading"
        class="sidepanel-loading-overlay"
      >
        <KCircularLoader :size="48" />
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
  </SidePanelModal>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import KIcon from 'kolibri-design-system/lib/KIcon';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
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
    data() {
      return {
        selectedClasses: [], // Array of selected class IDs
        isLoading: false,
      };
    },
    computed: {
      formattedClasses() {
        return this.classes.map(cls => ({
          id: cls.id,
          label: cls.name,
        }));
      },
      selectedUsersCount() {
        return this.selectedUsers.size;
      },
      hasSelectedClasses() {
        return this.selectedClasses.length > 0;
      },
      getSelectedClassObjects() {
        return this.classes.filter(cls => this.selectedClasses.includes(cls.id));
      },
      userIds() {
        return Array.from(this.selectedUsers);
      },
    },
    methods: {
      async handleEnroll() {
        if (!this.hasSelectedClasses) {
          return;
        }

        this.isLoading = true;

        try {
          await this.assignCoachesToClasses();
          this.$router.back();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to assign coaches:', error);
        } finally {
          this.isLoading = false;
        }
      },

      async assignCoachesToClasses() {
        const selectedClasses = this.getSelectedClassObjects;
        const userIds = this.userIds;

        for (const classObj of selectedClasses) {
          await RoleResource.saveCollection({
            data: userIds.map(userId => ({
              collection: classObj.id,
              user: userId,
              kind: UserKinds.COACH,
            })),
          });
        }
      },

      handleCancel() {
        this.$router.back();
      },
    },
  };

</script>


<style scoped>

  .assign-coaches-content {
    position: relative;
  }

  .sidepanel-loading-overlay {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.8);
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
