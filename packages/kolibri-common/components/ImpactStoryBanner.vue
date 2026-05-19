<template>

  <div
    v-if="notification"
    class="impact-story-banner"
    :class="{ stacked: windowIsSmall }"
    :style="{ backgroundColor: $themePalette.blue.v_100 }"
  >
    <div class="text-column">
      <h2 class="banner-title">
        {{ title$() }}
      </h2>
      <p class="banner-message">
        {{ message$() }}
      </p>
      <a
        class="contact-line form-link"
        :href="storyFormHref"
      >
        {{ storyFormLine$({ url: storyFormDisplay }) }}
      </a>
    </div>
    <div class="whatsapp-column">
      <img
        v-if="qrSrc && !windowIsSmall"
        :src="qrSrc"
        :alt="qrAlt$()"
        class="qr-image"
        width="160"
        height="160"
      >
      <a
        class="contact-line"
        :href="whatsappHref"
      >
        {{ whatsappLine$({ phoneNumber: whatsappNumberDisplay }) }}
      </a>
    </div>
    <KIconButton
      class="dismiss-button"
      :ariaLabel="dismiss$()"
      icon="close"
      @click="dismiss"
    />
  </div>

</template>


<script>

  import { computed, ref } from 'vue';
  import QRCode from 'qrcode';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { currentLanguage } from 'kolibri/utils/i18n';
  import useUser from 'kolibri/composables/useUser';
  import LocalNotificationResource from 'kolibri-common/apiResources/LocalNotificationResource';
  import { impactStoryStrings } from 'kolibri-common/strings/impactStoryStrings';

  export const WHATSAPP_PATH = '16198972090';
  export const WHATSAPP_NUMBER_DISPLAY = '+1 619 897 2090';
  export const STORY_FORM_DISPLAY = 'le.fyi/story-form';
  export const STORY_FORM_HREF = `https://${STORY_FORM_DISPLAY}`;

  export default {
    name: 'ImpactStoryBanner',
    setup() {
      const { isSuperuser } = useUser();
      const { windowIsSmall } = useKResponsiveWindow();
      const qrSrc = ref(null);
      const notification = ref(null);

      const {
        title$,
        message$,
        dismiss$,
        whatsappLine$,
        whatsappIntroText$,
        storyFormLine$,
        qrAlt$,
      } = impactStoryStrings;

      const whatsappHref = computed(() => {
        if (!notification.value) {
          return '';
        }
        const text = whatsappIntroText$({
          facilityName: notification.value.facility_name,
          learnerCount: notification.value.learner_count,
        });
        return `https://wa.me/${WHATSAPP_PATH}?text=${encodeURIComponent(text)}`;
      });

      // Hard gate: super-admin-only, English-only. Skips the fetch entirely
      // for non-applicable users.
      if (isSuperuser.value && currentLanguage === 'en') {
        LocalNotificationResource.fetchCollection().then(async rows => {
          notification.value = rows[0] || null;
          if (notification.value && !windowIsSmall.value) {
            qrSrc.value = await QRCode.toDataURL(whatsappHref.value, {
              margin: 1,
              width: 320,
            });
          }
        });
      }

      async function dismiss() {
        if (!notification.value) {
          return;
        }
        await LocalNotificationResource.deleteModel({ id: notification.value.id });
        notification.value = null;
      }

      return {
        notification,
        qrSrc,
        windowIsSmall,
        whatsappHref,
        whatsappNumberDisplay: WHATSAPP_NUMBER_DISPLAY,
        storyFormHref: STORY_FORM_HREF,
        storyFormDisplay: STORY_FORM_DISPLAY,
        dismiss,
        title$,
        message$,
        dismiss$,
        whatsappLine$,
        storyFormLine$,
        qrAlt$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .impact-story-banner {
    position: relative;
    display: flex;
    gap: 48px;
    align-items: stretch;
    padding: 16px;
    margin: 8px 0;
    border-radius: 8px;
  }

  .impact-story-banner.stacked {
    flex-direction: column;
    gap: 16px;
    padding-right: 48px;
  }

  .impact-story-banner.stacked .dismiss-button {
    position: absolute;
    top: 8px;
    right: 8px;
  }

  .banner-title {
    margin: 0;
    font-size: 16px;
  }

  .banner-message {
    margin: 0;
  }

  .text-column {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 8px;
  }

  .whatsapp-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .qr-image {
    flex-shrink: 0;
  }

  .contact-line {
    display: block;
  }

  .form-link {
    margin-top: auto;
  }

</style>
