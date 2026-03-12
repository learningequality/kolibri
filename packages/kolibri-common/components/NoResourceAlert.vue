<template>

  <div
    class="alert banner-spacing"
    :style="{ backgroundColor: $themePalette.yellow.v_200 }"
  >
    <div>
      <KIcon
        icon="warning"
        class="warning-icon"
        :color="$themePalette.yellow.v_600"
      />
    </div>

    <div class="error-message">
      <p>{{ noResourcesAvailable$() }}</p>
      <KExternalLink
        v-if="deviceContentUrl"
        :text="$tr('adminLink')"
        :href="deviceContentUrl"
      />
    </div>
  </div>

</template>


<script>

  import urls from 'kolibri/urls';
  import useUser from 'kolibri/composables/useUser';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';

  export default {
    name: 'NoResourceAlert',
    setup() {
      const { canManageContent } = useUser();
      const { noResourcesAvailable$ } = enhancedQuizManagementStrings;

      return {
        canManageContent,
        noResourcesAvailable$,
      };
    },
    computed: {
      deviceContentUrl() {
        const url = urls['kolibri:kolibri.plugins.device:device_management'];
        if (url && this.canManageContent) {
          return `${url()}#/content`;
        }
        return '';
      },
    },
    $trs: {
      adminLink: {
        message: 'Import channels to your device',
        context: 'Message for admin indicating the possibility of importing channels into Kolibri.',
      },
    },
  };

</script>


<style scoped lang="scss">

  .alert {
    position: relative;
    width: 100%;
    max-width: 1000px;
    padding: 0.5em;
    padding-left: 2em;
    margin: 1em auto 0;
  }

  .banner-spacing {
    margin: 0.5em 0 1em;
  }

  .error-message {
    margin-left: 3em;
    font-size: 14px;
  }

  .warning-icon {
    position: absolute;
    top: 1em;
    left: 1em;
    width: 24px;
    height: 24px;
  }

</style>
