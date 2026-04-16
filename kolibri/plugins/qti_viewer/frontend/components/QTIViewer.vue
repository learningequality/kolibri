<template>

  <div class="qti-viewer">
    <KCircularLoader v-if="loading" />
    <AssessmentItem
      v-else-if="resourceType === 'imsqti_item_xmlv3p0'"
      :xmlDoc="xmlDoc"
    />
  </div>

</template>


<script>

  import { computed, provide, ref, watch } from 'vue';
  import logger from 'kolibri-logging';
  import useContentViewer, { contentViewerProps } from 'kolibri/composables/useContentViewer';
  import useQTIResource from '../composables/useQTIResource';
  import { loadQTIPackage, parseXML } from '../utils/xml';
  import AssessmentItem from './AssessmentItem.vue';

  const logging = logger.getLogger(__filename);

  export default {
    name: 'QTIViewer',
    components: {
      AssessmentItem,
    },
    inheritAttrs: false,
    setup(props, context) {
      const { defaultFile, reportLoadingError } = useContentViewer(props, context);
      const packageLoading = ref(true);
      // Store resources by identifier
      const resourcesMap = ref({});

      // Reactively get current resource based on itemId
      const currentResource = computed(() => {
        return resourcesMap.value[props.itemId] || null;
      });

      const resourceUrl = computed(() => currentResource.value?.href);
      // If itemData is provided, we only support injecting AssessmentItem XML
      const resourceType = computed(() =>
        props.itemData ? 'imsqti_item_xmlv3p0' : currentResource.value?.type,
      );

      const {
        xmlDoc: resourceXmlDoc,
        loading: resourceLoading,
        error: resourceError,
      } = useQTIResource(resourceUrl);

      const xmlDoc = computed(() => {
        // If itemData is provided, use it directly
        if (props.itemData) {
          return parseXML(props.itemData);
        }
        // Otherwise, use the resource XML document
        return resourceXmlDoc.value;
      });

      const loading = computed(() => {
        if (props.itemData) {
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
            props.answerState?.QTI_CONTEXT ?? {
              candidateIdentifier: props.userId,
              testIdentifier: defaultFile?.checksum,
              environmentIdentifier: __version,
            },
        ),
      );

      provide(
        'answerState',
        computed(() => props.answerState || {}),
      );
      provide(
        'interactive',
        computed(() => props.interactive),
      );

      return {
        loading,
        xmlDoc,
        resourceType,
        /**
         * @public
         */
        checkAnswer,
      };
    },
    props: contentViewerProps,
  };

</script>


<style lang="scss">

  @import '../styles/qti-v3-core';

</style>
