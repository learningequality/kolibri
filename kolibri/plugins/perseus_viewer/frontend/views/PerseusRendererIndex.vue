<template>

  <div
    v-if="itemId || itemData"
    class="bibliotron-exercise perseus-root"
    :class="{ 'perseus-mobile': isMobile }"
    role="presentation"
    @keydown.enter.prevent="answerGiven"
  >
    <div
      class="framework-perseus"
      :style="{ margin: isMobile ? '0' : '0 24px' }"
    >
      <div
        ref="perseus"
        class="perseus"
      >
        <div class="loader-container">
          <KLinearLoader
            :delay="false"
            type="indeterminate"
          />
        </div>
      </div>
    </div>
    <NumericKeypad :lang="lang" />
  </div>

</template>


<script>

  // Import Wonder Blocks design tokens (CSS custom properties) required by
  // Perseus and math-input components.
  import '@khanacademy/wonder-blocks-tokens/styles.css';
  // Import Perseus and math-input CSS globally (not in scoped <style> block,
  // since Perseus renders via React and scoped selectors won't match).
  import '@khanacademy/perseus/styles.css';
  import '@khanacademy/math-input/styles.css';

  import invert from 'lodash/invert';
  import get from 'lodash/get';
  import ZipFile from 'kolibri-zip';
  import logger from 'kolibri-logging';
  import { Mapper, defaultFilePathMappers } from 'kolibri-zip/src/fileUtils';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useContentViewer, { contentViewerProps } from 'kolibri/composables/useContentViewer';
  import urls from 'kolibri/urls';
  import { createElement as e } from 'react';
  import { createRoot } from 'react-dom/client';
  import * as perseus from '@khanacademy/perseus';
  import { parseAndMigratePerseusItem, isFailure } from '@khanacademy/perseus-core';
  import { scorePerseusItem, emptyWidgetsFunctional } from '@khanacademy/perseus-score';
  import { MathInputI18nContextProvider } from '@khanacademy/math-input';
  import { KeypadContext } from '@khanacademy/keypad-context';
  import { RenderStateRoot } from '@khanacademy/wonder-blocks-core';
  import perseusTranslator from '../translator';
  import { wrapPerseusMessages } from '../translationUtils';
  import widgetSolver from '../widgetSolver';
  import { normalizeUserInput, localizeUserInput } from '../numeralNormalization';
  import useKeypad from '../composables/useKeypad';
  import imageMissing from './image_missing.svg';
  import TeX from './Tex';
  import NumericKeypad from './NumericKeypad';

  const translator = wrapPerseusMessages(perseusTranslator);

  const logging = logger.getLogger(__filename);

  // No-op stubs for Perseus dependency injection. Perseus requires these
  // but Kolibri doesn't use KA's analytics, video, or URL generation.
  const noOpAnalyticsEvent = async () => {};
  const perseusNoOpDependencies = {
    analytics: { onAnalyticsEvent: noOpAnalyticsEvent },
    generateUrl: ({ url }) => url,
    useVideo: () => ({ status: 'success', data: { video: null } }),
  };

  // Regex for all images, we use the differential matches in the first matching
  // group to determine if it's a graphie image or a regular image.
  const allImageRegex = /((web\+graphie:)?)\$\{☣ LOCALPATH\}\/([^)^"]+)/g;

  const svgLabelsRegex = /^web\+graphie:/;

  const blobImageRegex = /blob:[^)^"]+/g;

  /**
   * Global register of all Perseus files. This object is used to keep track of all Perseus files
   * across multiple instances of the PerseusRenderer. This allows for reuse of the same file and
   * prevents collisions between different instances where they might try to render the same image
   * from the same file, but with different URLs. This also allows us to only monkey patch the Util
   * functions once, as it gives us a global register and prevents duelling components from
   * overriding each other.
   * @type {{
   *  [key: string]: {
   *    zipFile: ZipFile,
   *    usageCounter: number,
   *    imageUrls: {[key: string]: string},
   *  },
   * }}
   * @property {ZipFile} zipFile - A ZipFile object for the Perseus file.
   * @property {number} usageCounter - The number of components using this object.
   * @property {{[key: string]: string}} imageUrls - A lookup object mapping from the image
   * filename to the URL generated for that image for display.
   */
  const globalPerseusFileRegistry = {};

  function setUpPerseusFile(defaultFile) {
    const perseusFileUrl = defaultFile.storage_url;
    if (globalPerseusFileRegistry[perseusFileUrl]) {
      globalPerseusFileRegistry[perseusFileUrl].usageCounter += 1;
    } else {
      globalPerseusFileRegistry[perseusFileUrl] = {
        zipFile: null,
        usageCounter: 1,
        imageUrls: {},
      };
      class JSONMapper extends Mapper {
        getPaths() {
          return getImagePaths(this.file.toString());
        }
        replacePaths(packageFiles) {
          return replaceImageUrls(this.file.toString(), perseusFileUrl, packageFiles);
        }
      }

      const filePathMappers = {
        ...defaultFilePathMappers,
        json: JSONMapper,
      };
      globalPerseusFileRegistry[perseusFileUrl].zipFile = new ZipFile(perseusFileUrl, {
        filePathMappers,
        largeFileUrlGenerator: filepath => urls.zipContentUrl(defaultFile, filepath),
      });
    }
  }

  function cleanUpPerseusFile(perseusFileUrl) {
    if (globalPerseusFileRegistry[perseusFileUrl]) {
      globalPerseusFileRegistry[perseusFileUrl].usageCounter -= 1;
      if (globalPerseusFileRegistry[perseusFileUrl].usageCounter === 0) {
        globalPerseusFileRegistry[perseusFileUrl].zipFile.close();
        delete globalPerseusFileRegistry[perseusFileUrl];
      }
    }
  }

  function getImageUrl(key, zipFileUrl = null) {
    if (zipFileUrl !== null && globalPerseusFileRegistry[zipFileUrl]) {
      return globalPerseusFileRegistry[zipFileUrl].imageUrls[key];
    }
    for (const file in globalPerseusFileRegistry) {
      if (globalPerseusFileRegistry[file].imageUrls[key]) {
        return globalPerseusFileRegistry[file].imageUrls[key];
      }
    }
    return;
  }

  function getImagePaths(itemResponse) {
    const graphieMatches = {};
    const imageMatches = {};
    const matches = Array.from(itemResponse.matchAll(allImageRegex));

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      if (match[1]) {
        // We have a match for the optional web+graphie matching group
        graphieMatches[match[3]] = true;
      } else {
        imageMatches[match[3]] = true;
      }
    }
    const graphieImages = Object.keys(graphieMatches);
    const images = Object.keys(imageMatches);
    const svgAndJson = graphieImages.reduce(
      (acc, image) => [...acc, `${image}.svg`, `${image}-data.json`],
      [],
    );
    return images.concat(svgAndJson);
  }

  function replaceImageUrls(itemResponse, zipFileUrl, packageFiles = {}) {
    const imageUrls = globalPerseusFileRegistry[zipFileUrl].imageUrls;
    Object.assign(imageUrls, packageFiles);
    // If the file is not present in the zip file, then fill in a missing image
    // file for images, and an empty dummy json file for json
    return itemResponse.replace(allImageRegex, (match, g1, g2, image) => {
      if (g1) {
        // Replace any placeholder values for image URLs with the
        // `web+graphie:` prefix separately from any others,
        // as they are parsed slightly differently to standard image
        // urls (Perseus adds the protocol in place of `web+graphie:`).
        if (!getImageUrl(image, zipFileUrl)) {
          imageUrls[image] = 'data:application/json,';
        }
        return `web+graphie:${image}`;
      } else {
        // Replace any placeholder values for image URLs with
        // the base URL for the perseus file we are reading from
        return getImageUrl(image, zipFileUrl) || imageMissing;
      }
    });
  }

  function restoreImageUrls(itemResponse, perseusFileUrl) {
    const imageUrls = globalPerseusFileRegistry[perseusFileUrl].imageUrls;
    const lookup = invert(imageUrls);
    return JSON.parse(
      JSON.stringify(itemResponse).replace(blobImageRegex, match => {
        // Make sure to add our prefix back in
        return '${☣ LOCALPATH}/' + lookup[match] || '';
      }),
    );
  }

  perseus.Util.getDataUrl = url => {
    return getImageUrl(url.replace(svgLabelsRegex, '') + '-data.json');
  };
  perseus.Util.getSvgUrl = url => {
    return getImageUrl(url.replace(svgLabelsRegex, '') + '.svg');
  };
  perseus.Util.getRealImageUrl = url => {
    if (perseus.Util.isLabeledSVG(url)) {
      return perseus.Util.getSvgUrl(url);
    }

    return url;
  };

  perseus.Util.getImageSizeModern = async function getImageSizeModern(url) {
    const image = new Image();

    return new Promise((resolve, reject) => {
      // Handle the success case
      image.onload = () => {
        resolve([image.naturalWidth, image.naturalHeight]);
      };

      // Handle the error case
      image.onerror = reject;

      // Kick off the loading
      image.src = perseus.Util.getRealImageUrl(url);
    });
  };

  // Cheap 32-bit string hash for deriving a stable React key from item data
  // when no itemId is available (items can be driven by the raw itemData prop).
  // It only needs to differ between distinct items; a collision merely falls
  // back to the previous in-place reconcile behaviour for that rare pair.
  function quickHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash;
  }

  perseus.Util.getImageSize = (url, callback) => {
    // The previous implementation was only for IE11 compatibility,
    // which we do not support anymore.
    perseus.Util.getImageSizeModern(url).then(([width, height]) => {
      if (callback) {
        // Perseus calls this with a (width, height) callback and uses the two
        // arguments directly (e.g. SvgImage.onImageLoad sets imageDimensions:
        // [width, height]). getImageSizeModern resolves a [width, height] array,
        // so spread it — passing the array as a single arg makes width the whole
        // array and height undefined, yielding a NaN graphie box that falls back
        // to 340x340 and overflows/misaligns labels on auto-sized SVG images.
        callback(width, height);
      }
    });
  };

  export default {
    name: 'PerseusRendererIndex',
    components: {
      NumericKeypad,
    },
    setup(props, context) {
      const { windowBreakpoint } = useKResponsiveWindow();
      const { defaultFile, contentDirection } = useContentViewer(props, context);
      const { keypadAPI, keypadContextValue } = useKeypad();

      return {
        windowBreakpoint,
        defaultFile,
        contentDirection,
        keypadAPI,
        keypadContextValue,
      };
    },
    props: contentViewerProps,
    data: () => ({
      // Is the perseus item loading?
      loading: true,
      itemRendererUpdating: false,
      // state about the answer
      message: null,
      // default item data
      item: {},
      // Store a copy of the blank state of a question to clear set answers later
      blankState: null,
      hintsVisible: 0,
    }),
    computed: {
      isMobile() {
        return this.windowBreakpoint < 3;
      },
      /* eslint-disable vue/no-unused-properties */
      availableHints() {
        /* eslint-enable */
        return this.totalHints - this.hintsVisible;
      },
      totalHints() {
        return get(this.item, 'hints.length', 0);
      },
    },
    watch: {
      itemId() {
        this.loadItemData();
      },
      itemData(newItemData) {
        this.setItemData(newItemData);
      },
      answerState(newState) {
        this.resetState(newState);
      },
      showCorrectAnswer(newVal) {
        this.resetState(newVal);
      },
    },
    beforeDestroy() {
      this.$emit('stopTracking');
      if (this._overflowResizeHandler) {
        window.removeEventListener('resize', this._overflowResizeHandler);
      }
      if (this.$refs.perseus) {
        this.$refs.perseus.removeEventListener('pointerdown', this.reshowKeypadOnInput);
      }
      this.clearItemRenderer();
      cleanUpPerseusFile(this.perseusFileUrl);
    },
    created() {
      this.itemRenderer = null;
      this.root = null;
      // React key for the current item; set per new item in renderNewItem.
      this.itemRenderKey = null;
      // This is a local object for tracking image URLs
      // we use this to clean up image URLs just for this component
      this.imageUrls = {};
      // This is how Perseus handles dependency injection now
      // all of the following appear to be required, otherwise
      // Perseus will throw runtime errors.
      perseus.Dependencies.setDependencies({
        // JIPT stands for Just In Place Translation
        // i.e. the system used by Crowdin for in-context translation.
        JIPT: {
          useJIPT: false,
        },
        // This is the component that actually renders TeX either with KaTeX or Mathjax.
        TeX,
        isDevServer: process.env.NODE_ENV !== 'production',
        // We set this to 'en' regardless of the language being used, so as to
        // avoid Perseus trying to load localized data URLs. This allows our monkey patching
        // to be done more simply, and avoid having to do specific edits of the source code.
        kaLocale: 'en',
        // For some reason this is defined here as well as in the apiOptions
        isMobile: this.isMobile,
        // Identity function: we already preprocess all content URLs ourselves.
        // Despite generateUrl being added in v70, staticUrl is still read from
        // dependencies in v75 by the Protractor and Grapher widgets (for their
        // own bundled assets), so it must stay defined or those widgets throw.
        staticUrl: url => url,
        // Pass our logging object to capture Log messages from Perseus
        Log: logging,
      });
      perseus.init();
      // Try to load the appropriate directional CSS for the particular content
      this.$options.contentModule.loadDirectionalCSS(this.contentDirection).then(() => {
        if (this.defaultFile) {
          this.loadItemData();
        } else if (this.itemData) {
          this.setItemData(this.itemData);
        }
        this.$emit('startTracking');
      });
    },
    methods: {
      validateItemData(obj) {
        return (
          [
            // A somewhat protracted validator to ensure that our item data conforms
            // to that expected by the Perseus ItemRenderer,
            // c.f. https://github.com/Khan/perseus/blob/master/src/item-renderer.jsx#L35
            'calculator',
            'chi2Table',
            'periodicTable',
            'tTable',
            'zTable',
          ].reduce(
            /* eslint-disable no-mixed-operators */
            // Loop through all of the above properties and ensure that if the 'answerArea'
            // property of the item has them, then their values are set to Booleans.
            (prev, key) =>
              !(
                !prev ||
                (Object.prototype.hasOwnProperty.call(obj.answerArea, key) &&
                  typeof obj.answerArea[key] !== 'boolean')
              ),
            true,
          ) &&
          // Check that the 'hints' property is an Array.
          Array.isArray(obj.hints) &&
          obj.hints.reduce(
            // Check that each hint in the hints array is an object (and not null)
            (prev, item) => item && typeof item === 'object',
            true,
          ) &&
          // Check that the question property is an object (and not null)
          obj.question &&
          typeof obj.question === 'object'
        );
        /* eslint-enable no-mixed-operators */
      },
      renderItem() {
        this.itemRendererUpdating = true;
        // Data formatted in the form expected by the Server Item Renderer
        const itemRenderData = {
          hintsVisible: this.hintsVisible,
          item: this.item,
          problemNum: Math.floor(Math.random() * 1000),
          reviewMode: this.showCorrectAnswer,
          showSolutions: this.showCorrectAnswer ? 'all' : 'none',
          apiOptions: {
            isArticle: false,
            // Pass in callbacks for widget interaction and focus change.
            // Here we dismiss answer error message on interaction and focus change.
            interactionCallback: this.interactionCallback,
            trackInteraction: this.interactionCallback,
            onFocusChange: this.dismissMessage,
            onInputError: logging.error,
            isMobile: this.isMobile,
            // Always use our custom keypad implementation
            customKeypad: true,
            readOnly: !this.interactive,
            hintProgressColor: this.$themeTokens.primary,
          },
          ref: itemRenderer => {
            this.itemRenderer = itemRenderer;
            if (itemRenderer) {
              this.$emit('itemRendererUpdated');
              this.itemRendererUpdating = false;
            }
          },
          dependencies: perseusNoOpDependencies,
        };
        // Create react component with current item data.
        // If the component already existed, this will perform an update.
        const itemRendererElement = e(perseus.ServerItemRenderer, {
          // Keyed per loaded item so React remounts the item subtree (running
          // graphie cleanup) on item switch instead of reconciling imperative
          // graphie widget state in place, which crashes mid-swap. Stable
          // across hint re-renders (same key) so those still update in place.
          key: this.itemRenderKey,
          ...itemRenderData,
          keypadElement: this.interactive ? this.keypadAPI : null,
        });
        const perseusStringsElement = e(perseus.PerseusI18nContextProvider, {
          locale: this.lang,
          strings: translator,
          children: itemRendererElement,
        });
        const mathInputStringsElement = e(MathInputI18nContextProvider, {
          locale: this.lang,
          strings: translator,
          children: perseusStringsElement,
        });
        const dependencyContextElement = e(perseus.Dependencies.DependenciesContext.Provider, {
          value: perseusNoOpDependencies,
          children: mathInputStringsElement,
        });
        const keypadContextElement = e(KeypadContext.Provider, {
          value: this.keypadContextValue,
          children: dependencyContextElement,
        });
        const renderStateRootElement = e(RenderStateRoot, { children: keypadContextElement });
        if (!this.root) {
          this.root = createRoot(this.$refs.perseus);
          this.$refs.perseus.addEventListener('pointerdown', this.reshowKeypadOnInput);
        }
        this.root.render(renderStateRootElement);
      },
      renderNewItem() {
        // Clear any pending state reset calls
        this.$off('itemRendererUpdated');
        // Dismiss the keypad
        if (this.keypadAPI) {
          this.keypadAPI.dismiss();
        }
        this.$once('itemRendererUpdated', () => {
          // Blur any previously focused element once we have rendered a new item
          this.itemRenderer.blur();
          // Wait for the itemRenderer to be updated before setting the answer
          // This is necessary because the itemRenderer may not be available immediately
          // or may be in the process of updating, and contain stale state from the previous item.
          // The first thing we do in setAnswer is read the blank state from the itemRenderer,
          // so we need to ensure that the itemRenderer is available and up to date first.
          this.setAnswer();
        });
        // Derive a fresh key for this item so the item subtree remounts cleanly
        // rather than reconciling the previous item's graphie state. Prefer the
        // itemId; fall back to a hash of the item when driven by the itemData prop.
        this.itemRenderKey = this.itemId || quickHash(JSON.stringify(this.item));
        this.renderItem();
      },
      _resetState(val) {
        if (!val) {
          this.restoreAnswerState(this.blankState);
        }
        this.setAnswer();
      },
      resetState(val) {
        // Because resetState is called in response to watching props, we need to ensure
        // that the itemRenderer is available and not in the process of updating before
        // we try to reset the state.
        if (this.itemRenderer && !this.itemRendererUpdating && !this.loading) {
          this._resetState(val);
        } else {
          this.$once('itemRendererUpdated', () => {
            this._resetState(val);
          });
        }
      },
      clearItemRenderer() {
        // Clean up any existing itemRenderer to avoid leak memory
        // https://facebook.github.io/react/blog/2015/10/01/react-render-and-top-level-api.html
        // Nest this in a try catch block so that we can call this method aggressively
        // to ensure clean up without worrying about whether React has already cleaned up this
        // component.
        try {
          if (this.root) {
            this.root.unmount();
            this.root = null;
          }
          this.itemRenderer = null;
        } catch (e) {
          logging.debug('Error during unmounting of item renderer', e);
        }
      },
      getAnswerState() {
        if (!this.itemRenderer) {
          return {};
        }
        // Normalize any non-Western numerals so saved state is always ASCII.
        const userInput = normalizeUserInput(this.itemRenderer.getUserInput());
        // To prevent propagation of our locally replaced blob URLs into answers,
        // we need to replace them with the original URLs.
        return restoreImageUrls(
          { userInput, hintsVisible: this.hintsVisible },
          this.perseusFileUrl,
        );
      },
      restoreAnswerState(answerState) {
        if (!answerState) {
          return;
        }
        let userInput;
        if (answerState.userInput) {
          // New UserInputMap format
          userInput = answerState.userInput;
        } else if (answerState.question) {
          // Old serialized state format (pre-v75) — convert using deprecated helper.
          // This backward compatibility path must be kept indefinitely because
          // existing saved answer states in the wild use this format.
          userInput = perseus.deriveUserInputFromSerializedState(
            answerState.question,
            this.item.question.widgets,
          );
        }
        if (userInput) {
          // Restore image URLs from placeholders to blob URLs
          userInput = JSON.parse(replaceImageUrls(JSON.stringify(userInput), this.perseusFileUrl));
          // Localize ASCII digits back to the content locale's numeral system
          // so users see their saved answers in their native format.
          // (Phase 1 normalized input to ASCII for scoring/storage.)
          const locale = this.lang && this.lang.id;
          userInput = localizeUserInput(userInput, locale);
          // Restore each widget's user input via the Renderer's handleUserInput callback
          const widgetIds = this.itemRenderer.getWidgetIds();
          for (const id of widgetIds) {
            if (userInput[id] !== undefined) {
              this.itemRenderer.questionRenderer.props.handleUserInput(id, userInput[id], false);
            }
          }
        }
        if (answerState.hintsVisible) {
          this.hintsVisible = answerState.hintsVisible;
        }
      },
      setAnswer() {
        this.blankState = this.getAnswerState();
        // If a passed in answerState has user input or old-format question/hints, restore.
        if (this.answerState && (this.answerState.userInput || this.answerState.question)) {
          this.restoreAnswerState(this.answerState);
        } else if (this.showCorrectAnswer) {
          this.setCorrectAnswer();
        }
      },
      /**
       * Score the current answer state through the Perseus item renderer and
       * return the result, or null when the renderer is not yet ready.
       * @returns {?{correct: boolean, answerState: object, simpleAnswer: string}}
       * The check result, or null when no answer can be checked.
       * @public
       */
      checkAnswer() {
        if (this.itemRenderer && !this.loading) {
          // getAnswerState normalizes non-Western numerals and restores image URLs.
          const answerState = this.getAnswerState();
          const userInput = answerState.userInput;
          const widgetIds = this.itemRenderer.getWidgetIds();
          // Restore the rubric's image URLs too: getAnswerState put userInput into
          // ${☣ LOCALPATH} space, and image-content answers (orderer, sorter, …)
          // only score correct when rubric and userInput share one URL space.
          const rubric = restoreImageUrls(this.item.question, this.perseusFileUrl);
          // Use the content language for locale-sensitive scoring (e.g., decimal separators)
          const locale = this.lang?.id || 'en';
          const score = scorePerseusItem(rubric, userInput, locale);
          const emptyWidgets = emptyWidgetsFunctional(rubric.widgets, widgetIds, userInput, locale);
          const empty = emptyWidgets.length > 0;
          const correct = score.type === 'points' && score.earned === score.total;
          const message = score.message || null;

          if (message && empty) {
            this.message = message;
          }
          // Even if the answer is 'empty' according to perseus, it can contain
          // meaningful state - so we should still return it.
          // The most salient example of this is multi-select multiple choice
          // where if insufficient responses have been given, this is counted
          // as 'empty'.
          // We cannot reliably get simplified answers from Perseus, so don't try.
          const simpleAnswer = '';
          return {
            correct,
            answerState,
            simpleAnswer,
          };
        }
        return null;
      },
      answerGiven(e) {
        if (e) {
          // This is a hack to prevent enter keydown event from propagating when the mobile keypad
          // is open and the user is dismissing the keypad with the enter key. The only reliable
          // marker for this is the ariaLabel of the button that is clicked.
          if (e.target.tagName === 'BUTTON' && e.target.ariaLabel === translator.dismiss) {
            return;
          }
        }
        const answer = this.checkAnswer();
        if (answer) {
          this.$emit('answerGiven', answer);
        }
      },
      /**
       * Reveal the next hint and emit the updated answer state.
       * @public
       */
      takeHint() {
        if (this.itemRenderer && this.hintsVisible < this.totalHints) {
          this.hintsVisible += 1;
          this.renderItem();
          this.$emit('hintTaken', { answerState: this.getAnswerState() });
        }
      },
      interactionCallback() {
        this.$emit('interaction');
        this.dismissMessage();
      },
      dismissMessage() {
        // dismiss the error message when user click anywhere inside the perseus element.
        this.message = null;
      },
      reshowKeypadOnInput(event) {
        // MathInput's own click-to-reshow lags a render on mouse; do it on pointerdown.
        if (this.interactive && event.target.closest('.keypad-input')) {
          this.keypadAPI.activate();
        }
      },
      loadItemData() {
        // Only try to do this if itemId is defined.
        if (this.itemId && this.defaultFile && this.defaultFile.storage_url) {
          this.loading = true;
          if (this.perseusFileUrl !== this.defaultFile.storage_url) {
            cleanUpPerseusFile(this.perseusFileUrl);
            setUpPerseusFile(this.defaultFile);
            this.perseusFileUrl = this.defaultFile.storage_url;
          }
          globalPerseusFileRegistry[this.perseusFileUrl].zipFile
            .file(`${this.itemId}.json`)
            .then(itemFile => {
              const itemResponse = itemFile.toString();
              this.setItemData(JSON.parse(itemResponse));
              this.loading = false;
            })
            .catch(reason => {
              logging.debug('There was an error loading the assessment item data: ', reason);
              this.clearItemRenderer();
              this.$emit('itemError', reason);
            });
        }
      },
      setItemData(itemData) {
        const result = parseAndMigratePerseusItem(itemData);
        if (isFailure(result)) {
          logging.warn('Failed to migrate Perseus item data', result.detail);
          // Fall through with original data as graceful degradation
        } else {
          itemData = result.value;
        }
        if (this.validateItemData(itemData)) {
          this.item = itemData;
          // Don't store blank state for another item.
          this.blankState = null;

          // Clear any currently displayed hints when we render an item.
          this.hintsVisible = 0;

          // Clear any currently displayed messages when we render an item.
          this.dismissMessage();
          if (this.$el) {
            // Don't try to render if our component is not mounted yet.
            this.renderNewItem();
          } else {
            this.$once('mounted', this.renderNewItem);
          }
        } else {
          logging.warn('Loaded item was malformed', itemData);
        }
      },
      setCorrectAnswer() {
        const questionRenderer = this.itemRenderer.questionRenderer;
        const widgetProps = questionRenderer.state.widgetInfo;

        const gradedWidgetIds = questionRenderer.widgetIds.filter(id => {
          return widgetProps[id].graded == null || widgetProps[id].graded;
        });

        try {
          gradedWidgetIds.forEach(id => {
            const props = widgetProps[id];
            const widget = questionRenderer.getWidgetInstance(id);
            if (!widget) {
              // This can occur if the widget has not yet been rendered
              return;
            }
            widgetSolver(widget, props.type, props.options);
          });
        } catch (e) {
          this.$emit('answerUnavailable');
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  /deep/ .perseus-hint-renderer {
    padding-left: 16px;
    border-left-style: none;
  }

  /deep/ .perseus-hint-label {
    margin-left: 16px;
  }

  .loader-container {
    width: 100%;
    height: 4px;
  }

  .perseus-mobile {
    .perseus {
      padding: 16px;
    }
  }

  .framework-perseus {
    position: relative; /* Make it a positioning context */
    display: flex;
    flex-direction: column;
    height: 100%; /* Take up all available vertical space */

    // Orderer widget wrapper. Stops it from going off screen right
    /deep/ .orderer {
      min-width: 0;
    }
  }

  .perseus {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 24px;
    overflow: visible;
    background: white;
  }

  /deep/ .perseus > div {
    box-sizing: border-box;
    display: grid;
    // Use min(400px, 100%) to ensure that columns are at most 400px wide,
    // but can shrink to fit smaller screens
    grid-template-columns: repeat(auto-fit, minmax(#{'min(400px, 100%)'}, 1fr));
    gap: 10px; /* Optional: space between the grid items */
  }

  /deep/ .perseus {
    /* Override Perseus' responsive SVG image display which forces full width */
    .paragraph > .svg-image {
      display: inline-block;
      vertical-align: middle;
    }
  }

</style>


<style lang="scss">

  .perseus-root {
    position: relative;
    height: 100%;

    // Perseus v75 uses Aphrodite (CSS-in-JS) for its own styling, but
    // still expects certain browser defaults to be neutralized.
    // Unlike v22, a full Eric Meyer reset is too aggressive here — it
    // fights with Perseus's inline-block layout for radio choices.
    // Instead, we surgically reset just the elements that Kolibri's
    // global styles interfere with.
    fieldset {
      padding: 0;
      margin: 0;
      border: 0;
    }

    ol,
    ul {
      padding: 0;
      margin: 0;
      list-style: none;
    }

    table {
      border-spacing: 0;
      border-collapse: collapse;
    }

    fieldset[class*='perseus_'] {
      // The choice indicator is position:fixed with no insets, so it sits at
      // its static (top-left) position. Flex-centering the <li> resolves that
      // static position to vertical-center — without pulling the indicator into
      // flow, so Perseus' constant content offset (which keeps choices aligned
      // when review mode widens correct indicators) is preserved. Scoped to
      // role="listitem" to avoid other widgets' styled <li>s.
      li[role='listitem'] {
        display: flex;
        align-items: center;
      }

      // Perseus wraps the choices in a div with an inline overflow-x: auto.
      // Because one axis is non-visible, the browser forces overflow-y to auto
      // as well, producing a nested vertical scrollbar around the choices. Let
      // them flow into the surrounding scroll context instead. (!important is
      // required to beat Perseus' inline overflow-x.)
      > div {
        overflow: visible !important;
      }
    }

    // Disable Perseus' click-to-zoom on images (added in v72.2.0). It overlays
    // a full-size "Zoom image" button on every non-decorative image, including
    // tiny ones where zooming is unhelpful, and adds unwanted whitespace around
    // some formulas. There is no apiOption to opt out, so we hide the overlay
    // button (always a direct child of .svg-image) — the image still renders,
    // it just isn't clickable to zoom.
    .svg-image > button {
      display: none;
    }
  }

</style>
