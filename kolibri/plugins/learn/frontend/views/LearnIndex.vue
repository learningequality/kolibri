<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
  >
    <transition name="delay-entry">
      <PicturePasswordAssignedModal
        v-if="showPicturePasswordModal"
        :picturePassword="assignedPicturePassword"
        :iconStyle="assignedIconStyle"
        :showIconText="assignedShowIconText"
        @confirm="dismissPicturePasswordModal"
      />
    </transition>

    <router-view />
  </NotificationsRoot>

</template>


<script>

  import { ref, onMounted } from 'vue';
  import { get, useSessionStorage, StorageSerializers } from '@vueuse/core';
  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import PicturePasswordAssignedModal from 'kolibri-common/components/PicturePasswordAssignedModal.vue';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import { useFacilityConfig } from 'kolibri-common/composables/useFacility';
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
      const { isUserLoggedIn, isAppContext, currentUserId, userFacilityId } = useUser();
      const { picturePasswordSettings, fetchFacilityConfig } = useFacilityConfig(userFacilityId);
      const picturePasswordPending = useSessionStorage(
        PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING,
        null,
        { serializer: StorageSerializers.string },
      );

      const showPicturePasswordModal = ref(false);
      const assignedPicturePassword = ref(null);
      const assignedIconStyle = ref(null);
      const assignedShowIconText = ref(null);

      onMounted(async () => {
        if (picturePasswordPending.value !== 'true') return;

        const [user] = await Promise.all([
          FacilityUserResource.fetchModel({ id: get(currentUserId) }),
          // fetchFacilityConfig() implicitly populates picturePasswordSettings via the
          // facilityConfig ref inside useFacilityConfig — it must resolve before we read it below
          fetchFacilityConfig(),
        ]);

        if (user.picture_password && picturePasswordSettings.value) {
          picturePasswordPending.value = null;
          assignedPicturePassword.value = user.picture_password;
          assignedIconStyle.value = picturePasswordSettings.value.icon_style;
          assignedShowIconText.value = picturePasswordSettings.value.show_icon_text;
          showPicturePasswordModal.value = true;
        }
      });

      function dismissPicturePasswordModal() {
        showPicturePasswordModal.value = false;
      }

      return {
        isUserLoggedIn,
        isAppContext,
        showPicturePasswordModal,
        assignedPicturePassword,
        assignedIconStyle,
        assignedShowIconText,
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
