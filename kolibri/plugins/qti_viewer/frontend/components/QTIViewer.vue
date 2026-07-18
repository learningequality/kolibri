<template>

  <div class="qti-viewer">
    <KCircularLoader v-if="loading" />
    <template v-else-if="resourceType === 'imsqti_item_xmlv3p0'">
      <AssessmentItem :xmlDoc="xmlDoc" />
      <QTIHints :hints="revealedHints" />
    </template>
  </div>

</template>


<script>

  import { computed, provide, ref, watch } from 'vue';
  import logger from 'kolibri-logging';
  import useContentViewer from 'kolibri/composables/useContentViewer';
  import useQTIResource from '../composables/useQTIResource';
  import useHints from '../composables/useHints';
  import { loadQTIPackage, parseXML } from '../utils/xml';
  import AssessmentItem from './AssessmentItem.vue';
  import QTIHints from './QTIHints.vue';

  const logging = logger.getLogger(__filename);

  export default {
    name: 'QTIViewer',
    components: {
      AssessmentItem,
      QTIHints,
    },
    inheritAttrs: false,
    setup(props, context) {
      const {
        defaultFile,
        itemData,
        itemId,
        answerState,
        userId,
        interactive,
        reportLoadingError,
        registerAssessmentApi,
      } = useContentViewer(context);
      const packageLoading = ref(true);
      // Store resources by identifier
      const resourcesMap = ref({});

      // Reactively get current resource based on itemId
      const currentResource = computed(() => {
        return resourcesMap.value[itemId.value] || null;
      });

      const resourceUrl = computed(() => currentResource.value?.href);
      // If itemData is provided, we only support injecting AssessmentItem XML
      const resourceType = computed(() =>
        itemData.value ? 'imsqti_item_xmlv3p0' : currentResource.value?.type,
      );

      const {
        xmlDoc: resourceXmlDoc,
        loading: resourceLoading,
        error: resourceError,
      } = useQTIResource(resourceUrl);

      const xmlDoc = computed(() => {
        // If itemData is provided, use it directly
        if (itemData.value) {
          return parseXML(itemData.value);
        }
        // Otherwise, use the resource XML document
        return resourceXmlDoc.value;
      });

      const loading = computed(() => {
        if (itemData.value) {
          return false;
        }
        return packageLoading.value || resourceLoading.value;
      });

      // Load and parse the QTI package
      async function load() {
        const file = defaultFile.value;
        if (!file) {
          return;
        }

        try {
          packageLoading.value = true;
          // Update the resources map
          resourcesMap.value = await loadQTIPackage(file);
        } catch (err) {
          logging.error('Error loading QTI package:', err);
          reportLoadingError(err);
        } finally {
          packageLoading.value = false;
        }
      }

      // Watch for resource loading errors
      watch(resourceError, err => {
        if (err) {
          reportLoadingError(err);
        }
      });

      // Watch for file changes
      watch(defaultFile, () => {
        load();
      });

      // Initial load
      load();

      let _checkAnswer = () => {
        logging.warn('No AssessmentItem has registered a checkAnswer handler function');
      };

      const checkAnswer = () => {
        return _checkAnswer();
      };

      const {
        totalHints,
        availableHints,
        revealedHints,
        takeHint: revealNextHint,
      } = useHints(xmlDoc);

      // Mirrors PerseusRendererIndex's takeHint: reveal the next hint, then emit
      // the answer state so the learn UI can record that a hint was used.
      const takeHint = () => {
        if (revealNextHint()) {
          const result = checkAnswer();
          context.emit('hintTaken', { answerState: result?.answerState });
        }
      };

      // Expose the public assessment API (checkAnswer + progressive-reveal
      // hints) to consumers via the ContentViewer wrapper.
      registerAssessmentApi({ checkAnswer, takeHint, availableHints, totalHints });

      provide('handlers', {
        interaction: () => context.emit('interaction'),
        answerGiven: () => context.emit('answerGiven', checkAnswer()),
        // Because the actual assessment item can be instantiated at a variety of levels
        // in the component hierarchy, we use this method to register a handler
        // for checking the answer - this function is invoked in AssessmentItem.vue
        // to allow direct reading of the assessment item responses and context to give
        // the answer state (and in future, the score)
        registerCheckAnswer: checkAnswerHandler => {
          _checkAnswer = checkAnswerHandler;
        },
      });
      // This should be put into a broader context declaration, but for now
      // we are using this to drill down the candidateIdentifier.
      provide(
        'QTI_CONTEXT',
        computed(
          () =>
            answerState.value?.QTI_CONTEXT ?? {
              candidateIdentifier: userId.value,
              testIdentifier: defaultFile.value?.checksum,
              environmentIdentifier: __version,
            },
        ),
      );

      provide(
        'answerState',
        computed(() => answerState.value || {}),
      );
      provide(
        'interactive',
        computed(() => interactive.value),
      );

      // The public assessment API (checkAnswer + progressive-reveal hints) is
      // registered above via registerAssessmentApi and re-exposed on the
      // ContentViewer wrapper, so it does not need to be exposed on this instance.
      // Only template bindings are returned here.
      return {
        loading,
        xmlDoc,
        resourceType,
        revealedHints,
      };
    },
  };

</script>


<style lang="scss">

  @import '../styles/qti-v3-core';

</style>
