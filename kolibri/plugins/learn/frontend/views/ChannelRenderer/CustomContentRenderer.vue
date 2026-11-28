<template>

  <div class="iframe-container">
    <ContentViewer
      :key="topic.id"
      class="content-viewer"
      :contentNode="topic"
      @navigateTo="navigateTo"
      @loaded="contentLoaded = true"
      @error="onError"
    />
    <UiAlert
      v-if="channelLoadFailed"
      class="error"
      type="error"
      :dismissible="false"
    >
      {{ channelLoadError$() }}
    </UiAlert>
    <ContentModal
      v-if="currentContent"
      :contentNode="currentContent"
      @close="currentContent = null"
    />
  </div>

</template>


<script>

  import { onBeforeUnmount, ref, shallowRef, watch } from 'vue';
  import { useRouter } from 'vue-router/composables';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import logger from 'kolibri-logging';
  import { ContentErrorConstants, ContentNodeKinds } from 'kolibri/constants';
  import { createTranslator } from 'kolibri/utils/i18n';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import useContentLink from '../../composables/useContentLink';
  import ContentModal from './ContentModal';

  const logging = logger.getLogger(__filename);

  const HANDLER_ERROR = 'HANDLER_ERROR';

  const { channelLoadError$ } = createTranslator('CustomContentRenderer', {
    channelLoadError: {
      message: 'Kolibri is unable to load this channel',
      context: 'Error shown when a custom channel fails to load in the content viewer.',
    },
  });

  export default {
    name: 'CustomContentRenderer',
    components: { ContentModal, UiAlert },
    setup(props) {
      const router = useRouter();
      const { genContentLinkBackLinkCurrentPage } = useContentLink();
      const currentContent = shallowRef(null);
      const channelLoadFailed = ref(false);
      const contentLoaded = ref(false);

      let latestNavigation = null;

      watch(
        () => props.topic.id,
        () => {
          channelLoadFailed.value = false;
          contentLoaded.value = false;
          currentContent.value = null;
          latestNavigation = null;
        },
      );

      onBeforeUnmount(() => {
        latestNavigation = null;
      });

      async function navigateTo({ nodeId }) {
        const navigation = {};
        latestNavigation = navigation;
        try {
          const contentNode = await ContentNodeResource.retrieve(nodeId);
          if (navigation !== latestNavigation) {
            return;
          }
          if (contentNode.kind === ContentNodeKinds.TOPIC) {
            await router.push(genContentLinkBackLinkCurrentPage(contentNode.id));
          } else {
            currentContent.value = contentNode;
          }
        } catch (error) {
          logging.error(`Could not navigate to content node ${nodeId}`, error);
        }
      }

      function onError(error) {
        const channelError =
          error?.error === HANDLER_ERROR || error?.error === ContentErrorConstants.LOADING_ERROR;
        if (channelError && !contentLoaded.value) {
          channelLoadFailed.value = true;
        }
      }

      return {
        currentContent,
        navigateTo,
        onError,
        contentLoaded,
        channelLoadFailed,
        channelLoadError$,
      };
    },
    props: {
      topic: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .iframe-container {
    @extend %momentum-scroll;

    position: absolute;
    top: 64px;
    left: 0;
    width: 100%;
    height: calc(100% - 64px);
    overflow: visible;
  }

  .content-viewer {
    height: 100%;
  }

  .error {
    position: absolute;
    top: 8px;
    left: 8px;
    width: calc(100% - 16px);
    text-align: left;
  }

</style>
