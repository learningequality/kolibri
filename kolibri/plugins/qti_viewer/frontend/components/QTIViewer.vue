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

  import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
  import logger from 'kolibri-logging';
  import useContentViewer from 'kolibri/composables/useContentViewer';
  import useQTIResource from '../composables/useQTIResource';
  import useHints from '../composables/useHints';
  import { resolveResponseProcessingNode } from '../utils/qti/declarations/templates';
  import { loadQTIPackage, parseXML } from '../utils/xml';
  import AssessmentItem from './AssessmentItem.vue';
  import QTIHints from './QTIHints.vue';

  const logging = logger.getLogger(__filename);

  /** @typedef {import('./AssessmentItem.vue').CheckAnswerResult} CheckAnswerResult */

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
        lang,
        reportLoadingError,
        registerAssessmentApi,
      } = useContentViewer(context);
      const packageLoading = ref(true);
      // Store resources by identifier
      const resourcesMap = ref({});
      // QTI package object for custom response processing template resolution
      const qtiPackage = ref(null);

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

      // Loading strategy: QTIViewer is responsible for ensuring all resources
      // are fully loaded before AssessmentItem mounts. This means fetching the
      // package, loading the item XML, and pre-resolving any response processing
      // templates (which may need to be fetched from the zip). AssessmentItem
      // can then assume all content is ready and operate synchronously.
      const templateLoading = ref(false);
      watch(
        [xmlDoc, qtiPackage],
        async ([doc, pkg]) => {
          if (!doc) return;
          const rpNode = doc.querySelector('qti-response-processing');
          if (!rpNode) return;
          templateLoading.value = true;
          await resolveResponseProcessingNode(rpNode, pkg);
          templateLoading.value = false;
        },
        { immediate: true },
      );

      const loading = computed(() => {
        if (itemData.value) {
          return false;
        }
        return packageLoading.value || resourceLoading.value || templateLoading.value;
      });

      // Load and parse the QTI package
      async function load() {
        const file = defaultFile.value;
        if (!file) {
          return;
        }

        try {
          packageLoading.value = true;
          const result = await loadQTIPackage(file);
          resourcesMap.value = result.resourcesMap;
          qtiPackage.value = result.qtiPackage;
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

      // Signal to consumers that the viewer is mounted and its internal
      // AssessmentItem has registered its checkAnswer handler, and pair it
      // with a stopTracking on teardown. Follows the Kolibri content-viewer
      // convention (see docs/frontend_architecture/single_page_apps.rst).
      let tracking = false;
      const startTracking = () => {
        if (tracking) {
          return;
        }
        tracking = true;
        context.emit('startTracking');
      };
      onMounted(() => {
        if (!loading.value) {
          startTracking();
        }
      });
      watch(
        loading,
        isLoading => {
          if (!isLoading) {
            startTracking();
          }
        },
        { flush: 'post' },
      );
      onBeforeUnmount(() => {
        if (tracking) {
          context.emit('stopTracking');
        }
      });

      /**
       * Registered checkAnswer handler; swapped in when an AssessmentItem mounts.
       * @type {() => CheckAnswerResult|undefined}
       */
      let _checkAnswer = () => {
        logging.warn('No AssessmentItem has registered a checkAnswer handler function');
      };

      /**
       * Run the registered AssessmentItem handler to score the current responses.
       * @returns {CheckAnswerResult|undefined}
       * The result from the registered handler, or `undefined` if no
       * AssessmentItem has registered yet.
       */
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

      /**
       * Handlers provided to descendant components. The assessment item is
       * instantiated at varying depths in the tree, so `registerCheckAnswer`
       * lets it install a handler that reads its own responses and context.
       * @typedef {object} QTIViewerHandlers
       * @property {() => void} interaction - Fires the `interaction` event
       * whenever a response variable changes.
       * @property {() => void} answerGiven - Runs `checkAnswer` and emits the
       * {@link CheckAnswerResult} via the `answerGiven` event.
       * @property {Function} registerCheckAnswer - Install the handler invoked
       * by `checkAnswer` / `answerGiven`. Signature:
       * `(handler: () => CheckAnswerResult) => void`.
       */
      provide('handlers', {
        interaction: () => context.emit('interaction'),
        answerGiven: () => context.emit('answerGiven', checkAnswer()),
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

      // The content's language, used to render numerals in the content's own numeral system
      // (keypad glyphs, and report-mode redisplay of numeric responses).
      provide('lang', lang);

      provide(
        'answerState',
        computed(() => answerState.value || {}),
      );
      provide(
        'interactive',
        computed(() => interactive.value),
      );

      provide('qtiPackage', qtiPackage);

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
