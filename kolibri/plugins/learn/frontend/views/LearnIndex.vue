<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
  >
    <transition name="delay-entry">
      <PicturePasswordAssignedModal
        v-if="showPicturePasswordModal"
        :picturePassword="assignedPicturePassword"
        @confirm="dismissPicturePasswordModal"
      />
    </transition>

    <router-view />
  </NotificationsRoot>

</template>


<script>

  import { ref, onMounted } from 'vue';
  import { get, useSessionStorage } from '@vueuse/core';
  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import PicturePasswordAssignedModal from 'kolibri-common/components/PicturePasswordAssignedModal.vue';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import useFacility from 'kolibri-common/composables/useFacility';
  import { PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING } from 'kolibri-common/constants/Auth';
  import plugin_data from 'kolibri-plugin-data';
  import useUser from 'kolibri/composables/useUser';
  import { PageNames } from '../constants';

  export default {
    name: 'LearnIndex',
    components: {
      NotificationsRoot,
      PicturePasswordAssignedModal,
    },
    setup() {
      const { isUserLoggedIn, isAppContext, currentUserId, isLearner } = useUser();
      const { fetchFacilityConfig, facilityConfig } = useFacility();
      const picturePasswordPending = useSessionStorage(
        PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING,
        false,
      );

      const showPicturePasswordModal = ref(false);
      const assignedPicturePassword = ref(null);

      onMounted(async () => {
        if (!picturePasswordPending.value) return;

        const [user] = await Promise.all([
          FacilityUserResource.fetchModel({ id: get(currentUserId) }),
          fetchFacilityConfig(),
        ]);

        if (user.picture_password) {
          assignedPicturePassword.value = user.picture_password;
          showPicturePasswordModal.value = true;
        } else if (!facilityConfig.value?.picture_password_settings || !isLearner.value) {
          picturePasswordPending.value = false;
        }
      });

      function dismissPicturePasswordModal() {
        picturePasswordPending.value = false;
        showPicturePasswordModal.value = false;
      }

      return {
        isUserLoggedIn,
        isAppContext,
        showPicturePasswordModal,
        assignedPicturePassword,
        dismissPicturePasswordModal,
      };
    },
    computed: {
      allowAccess() {
        return plugin_data.allowRemoteAccess || this.isAppContext;
      },
      userIsAuthorized() {
        if (this.pageName === PageNames.BOOKMARKS) {
          return this.isUserLoggedIn;
        }
        return (plugin_data.allowGuestAccess && this.allowAccess) || this.isUserLoggedIn;
      },
    },
  };

</script>
