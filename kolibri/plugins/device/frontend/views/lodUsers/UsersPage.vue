<template>

  <AppBarPage
    :title="usersLabel$()"
    class="users-page"
  >
    <KPageContainer>
      <div class="header">
        <h1>{{ usersLabel$() }}</h1>
        <KButton
          :text="importUserLabel$()"
          @click="showSelectDevice = true"
        />
      </div>
      <KCircularLoader v-if="loading" />
      <UsersList
        v-else
        :users="usersList"
      >
        <template #action="{ user }">
          <KButton
            :text="removeAction$()"
            appearance="flat-button"
            :disabled="user.id === currentUserId"
            @click="userIdToRemove = user.id"
          />
        </template>
      </UsersList>
    </KPageContainer>
    <KModal
      v-if="userIdToRemove"
      :title="removeUserLabel$()"
      :submitText="removeUserLabel$()"
      :cancelText="cancelAction$()"
      @submit="onRemoveUser(userIdToRemove)"
      @cancel="userIdToRemove = null"
    >
      <p>
        {{ removeUserDescription$() }}
      </p>
      <p>
        {{ removeUserCallToAction$() }}
      </p>
    </KModal>
    <KModal
      v-if="showCannotRemoveUser"
      :title="cannotRemoveUserTitle$()"
      :submitText="closeAction$()"
      @submit="resetShowCannotRemoveUser"
    >
      <p>
        {{ cannotRemoveUserDescription$() }}
      </p>
      <KExternalLink
        :text="editPermissionsAction$()"
        :href="getExternalEditPermissionsPath()"
        class="fix-link-line-height"
      />
    </KModal>
    <SelectDeviceModalGroup
      v-if="showSelectDevice"
      filterLODAvailable
      @submit="handleSelectDeviceSubmit"
      @cancel="showSelectDevice = false"
    />
  </AppBarPage>

</template>


<script>

  import { computed, ref } from 'vue';
  import useUser from 'kolibri/composables/useUser';
  import { LodTypePresets } from 'kolibri/constants';
  import AppBarPage from 'kolibri/components/pages/AppBarPage';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import SelectDeviceModalGroup from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup';
  import { lodUsersManagementStrings } from 'kolibri-common/strings/lodUsersManagementStrings';

  import { injectLodDeviceUsers } from './composables/useLodDeviceUsers';
  import UsersList from './UsersList.vue';

  export default {
    name: 'UsersPage',
    components: {
      UsersList,
      AppBarPage,
      SelectDeviceModalGroup,
    },
    setup() {
      const userIdToRemove = ref(null);
      const showSelectDevice = ref(false);

      const { currentUserId } = useUser();
      const {
        users,
        loading,
        usersBeingImported,
        showCannotRemoveUser,
        importLodMachineService,
        fetchUsers,
        removeUser,
        resetShowCannotRemoveUser,
      } = injectLodDeviceUsers();

      const usersList = computed(() => [
        ...users.value,
        ...usersBeingImported.value.map(user => ({
          ...user,
          isImporting: true,
        })),
      ]);

      const onRemoveUser = async userId => {
        const success = await removeUser(userId);
        userIdToRemove.value = null;
        if (success) {
          await fetchUsers({ force: true });
        }
      };

      const handleSelectDeviceSubmit = device => {
        importLodMachineService.send({
          type: 'CONTINUE',
          value: {
            importOrJoin: LodTypePresets.IMPORT,
            importDeviceId: device.id,
          },
        });
      };

      const getExternalEditPermissionsPath = () => {
        const pathname = window.location.pathname;
        const deviceIndex = pathname.indexOf('/device');
        const base = pathname.slice(0, deviceIndex) + '/device/#';
        return base + '/permissions';
      };

      const { usersLabel$, closeAction$, removeAction$, cancelAction$ } = coreStrings;
      const {
        importUserLabel$,
        removeUserLabel$,
        removeUserDescription$,
        cannotRemoveUserTitle$,
        editPermissionsAction$,
        removeUserCallToAction$,
        cannotRemoveUserDescription$,
      } = lodUsersManagementStrings;

      return {
        usersList,
        loading,
        currentUserId,
        userIdToRemove,
        showSelectDevice,
        showCannotRemoveUser,
        onRemoveUser,
        handleSelectDeviceSubmit,
        resetShowCannotRemoveUser,
        getExternalEditPermissionsPath,
        usersLabel$,
        closeAction$,
        removeAction$,
        cancelAction$,
        importUserLabel$,
        removeUserLabel$,
        cannotRemoveUserTitle$,
        removeUserDescription$,
        editPermissionsAction$,
        removeUserCallToAction$,
        cannotRemoveUserDescription$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .fix-link-line-height {
    // Override default global line-height of 1.15 which is not enough
    // space for links and makes scrollbar appear in their parent containers.
    line-height: 1.5;
  }

</style>
