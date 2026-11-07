<template>

  <component
    :is="BANNERS[notification.key]"
    v-if="notification"
    :notification="notification"
    @dismiss="dismiss"
  />

</template>


<script>

  import { ref } from 'vue';
  import { currentLanguage } from 'kolibri/utils/i18n';
  import useUser from 'kolibri/composables/useUser';
  import LocalNotificationResource from 'kolibri-common/apiResources/LocalNotificationResource';
  import ImpactStoryBanner from './ImpactStoryBanner';
  import DonationBanner from './DonationBanner';

  // Mirror the keys in kolibri/core/analytics/local_notifications.py.
  export const IMPACT_STORIES_KEY = 'impact-stories';
  export const DONATION_KEY = 'donation';

  const BANNERS = {
    [IMPACT_STORIES_KEY]: ImpactStoryBanner,
    [DONATION_KEY]: DonationBanner,
  };

  export default {
    name: 'LocalNotificationBanner',
    setup() {
      const { isSuperuser } = useUser();
      const notification = ref(null);

      if (isSuperuser.value && currentLanguage === 'en') {
        LocalNotificationResource.list().then(rows => {
          notification.value =
            Object.keys(BANNERS)
              .map(key => rows.find(row => row.key === key))
              .find(Boolean) || null;
        });
      }

      async function dismiss() {
        await LocalNotificationResource.delete(notification.value.id);
        const main = document.getElementById('main');
        if (main) {
          main.setAttribute('tabindex', -1);
          main.focus();
        }
        notification.value = null;
      }

      return {
        notification,
        dismiss,
        BANNERS,
      };
    },
  };

</script>
