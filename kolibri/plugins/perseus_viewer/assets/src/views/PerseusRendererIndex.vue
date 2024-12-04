<template>

  <div
    v-if="itemId || itemData"
    class="bibliotron-exercise perseus-root"
    :class="{ 'perseus-mobile': isMobile }"
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
  </div>

</template>


<script>

  import { StyleSheet } from 'aphrodite';
  import invert from 'lodash/invert';
  import get from 'lodash/get';
  import ZipFile from 'kolibri-zip';
  import logger from 'kolibri-logging';
  import { Mapper, defaultFilePathMappers } from 'kolibri-zip/src/fileUtils';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { defer } from 'underscore';
  import { createElement as e } from 'react';
  import { createPortal, render, unmountComponentAtNode } from 'react-dom';
  import * as perseus from '@khanacademy/perseus';
  import {
    MathInputI18nContextProvider,
    StatefulKeypadContextProvider,
    KeypadContext,
    MobileKeypad,
  } from '@khanacademy/math-input';
  import { RenderStateRoot } from '@khanacademy/wonder-blocks-core';
  import perseusTranslator from '../translator';
  import { wrapPerseusMessages } from '../translationUtils';
  import widgetSolver from '../widgetSolver';
  import imageMissing from './image_missing.svg';
  import TeX from './Tex';

  const translator = wrapPerseusMessages(perseusTranslator);

  const keypadStyle = StyleSheet.create({
    keypadContainer: {
      zIndex: 20,
      pointerEvents: 'none',
    },
  });

  const logging = logger.getLogger(__filename);

  const sorterWidgetRegex = /sorter [0-9]+/;

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
   *
   * @type {
   *  Object.<string, {zipFile: ZipFile, usageCounter: number, imageUrls: Object.<string, string>}>
   * }
   *
   * @property {ZipFile} zipFile - A ZipFile object for the Perseus file.
   * @property {number} usageCounter - The number of components using this object.
   * @property {Object.<string, string>} imageUrls - A lookup object mapping from the image filename
   * to the URL generated for that image for display.
   */
  const globalPerseusFileRegistry = {};

  function setUpPerseusFile(perseusFileUrl) {
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
  perseus.Util.getImageSize = (url, callback) => {
    const img = new Image();

    img.onload = function () {
      // Vendored from perseus to override image handling
      if (img.width === 0 && img.height === 0) {
        var _document$body;

        (_document$body = document.body) === null || _document$body === void 0
          ? void 0
          : _document$body.appendChild(img);

        defer(function () {
          var _document$body2;

          callback(img.clientWidth, img.clientHeight);
          (_document$body2 = document.body) === null || _document$body2 === void 0
            ? void 0
            : _document$body2.removeChild(img);
        });
      } else {
        callback(img.width, img.height);
      }
    };

    img.src = perseus.Util.getRealImageUrl(url);
  };

  export default {
    name: 'PerseusRendererIndex',
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      return {
        windowBreakpoint,
      };
    },
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
      this.clearItemRenderer();
      cleanUpPerseusFile(this.perseusFileUrl);
    },
    created() {
      this.itemRenderer = null;
      this.keypadElement = null;
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
        // We already preprocess all URLs
        // we may need to enhance this if we find one of the uses of it is breaking.
        staticUrl: url => url,
        // Pass our logging object to capture Log messages from Perseus
        Log: logging,
      });
      const initPromise = perseus.init({ skipMathJax: true });
      // Try to load the appropriate directional CSS for the particular content
      const cssPromise = this.$options.contentModule.loadDirectionalCSS(this.contentDirection);
      Promise.all([initPromise, cssPromise]).then(() => {
        if (this.defaultFile) {
          this.loadItemData();
        } else if (this.itemData) {
          this.setItemData(this.itemData);
        }
        this.$emit('startTracking');
      });
    },
    mounted() {
      this.$emit('mounted');
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
          dependencies: {
            analytics: {
              onAnalyticsEvent: async () => {},
            },
          },
        };
        // Create react component with current item data.
        // If the component already existed, this will perform an update.
        const keypadContextConsumerElement = e(
          KeypadContext.Consumer,
          { key: 'keypadContextConsumer' },
          ({ keypadElement }) => {
            this.keypadElement = keypadElement;
            return e(perseus.ServerItemRenderer, {
              ...itemRenderData,
              keypadElement: this.interactive ? keypadElement : null,
            });
          },
        );
        const keypadWithContextElement = e(
          KeypadContext.Consumer,
          { key: 'keypadWithContext ' },
          ({ setKeypadElement, renderer }) =>
            createPortal(
              e(MobileKeypad, {
                style: keypadStyle.keypadContainer,
                onElementMounted: el => {
                  // We need to add the class to the container element
                  // but the MobileKeypad component does not pass through
                  // React's className prop to the root element.
                  const domNode = el.getDOMNode();
                  if (domNode) {
                    domNode.classList.add('perseus-keypad-container');
                  }
                  setKeypadElement(el);
                },
                onDismiss: () => renderer && renderer.blur(),
                onAnalyticsEvent: async () => {},
              }),
              document.body,
            ),
        );
        const statefulKeypadContextProviderElement = e(StatefulKeypadContextProvider, {
          children: [keypadContextConsumerElement, keypadWithContextElement],
        });
        const perseusStringsElement = e(perseus.PerseusI18nContextProvider, {
          locale: this.lang,
          strings: translator,
          children: statefulKeypadContextProviderElement,
        });
        const mathInputStringsElement = e(MathInputI18nContextProvider, {
          locale: this.lang,
          strings: translator,
          children: perseusStringsElement,
        });
        const dependencyContextElement = e(perseus.Dependencies.DependenciesContext.Provider, {
          analytics: { onAnalyticsEvent: async () => {} },
          children: mathInputStringsElement,
        });
        const renderStateRootElement = e(RenderStateRoot, { children: dependencyContextElement });
        render(renderStateRootElement, this.$refs.perseus);
      },
      renderNewItem() {
        // Clear any pending state reset calls
        this.$off('itemRendererUpdated');
        // Dismiss the keypad
        if (this.keypadElement) {
          this.keypadElement.dismiss();
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
        this.renderItem();
      },
      _resetState(val) {
        if (!val) {
          this.restoreSerializedState(this.blankState);
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
          unmountComponentAtNode(this.$refs.perseus);
          this.itemRenderer = null;
        } catch (e) {
          logging.debug('Error during unmounting of item renderer', e);
        }
      },
      /*
       * Special method to extract the current state of a Perseus Sorter widget
       * as it does not currently properly support getSerializedState
       */
      addSorterState(questionState) {
        this.itemRenderer.getWidgetIds().forEach(id => {
          if (sorterWidgetRegex.test(id)) {
            if (questionState[id]) {
              const sortableComponent =
                this.itemRenderer.questionRenderer.getWidgetInstance(id).refs.sortable;
              questionState[id].options = sortableComponent.getOptions();
            }
          }
        });
        return questionState;
      },
      getSerializedState() {
        if (!this.itemRenderer) {
          return {};
        }
        // Default to empty array
        let hints = [];
        if (this.itemRenderer.hintsRenderer) {
          hints = Object.keys(this.itemRenderer.hintsRenderer.refs || {}).map(key =>
            this.itemRenderer.hintsRenderer.refs[key].getSerializedState(),
          );
        }
        const question = this.addSorterState(
          this.itemRenderer.questionRenderer.getSerializedState(),
        );
        // To prevent propagation of our locally replace blob URLs into answers,
        // we need to replace them with the original URLs.
        return restoreImageUrls({ hints, question }, this.perseusFileUrl);
      },
      restoreSerializedState(answerState) {
        if (answerState && answerState.question && answerState.hints) {
          answerState = JSON.parse(
            replaceImageUrls(JSON.stringify(answerState), this.perseusFileUrl),
          );
          const widgetIds = this.itemRenderer.getWidgetIds();
          // Because of a switch between the input-number and numeric-input widgets
          // it seems it is possible for us to have a serialized state with keys
          // that do not correspond to any widgets. We need to sanitize the state
          // before restoring it.
          const sanitizedQuestion = {};
          for (const key of widgetIds) {
            if (answerState.question[key]) {
              sanitizedQuestion[key] = answerState.question[key];
            }
          }
          answerState.question = sanitizedQuestion;
          this.itemRenderer.restoreSerializedState(answerState);
          widgetIds.forEach(id => {
            if (sorterWidgetRegex.test(id)) {
              if (answerState.question[id]) {
                const sortableComponent =
                  this.itemRenderer.questionRenderer.getWidgetInstance(id).refs.sortable;
                const newProps = Object.assign({}, sortableComponent.props, {
                  options: answerState.question[id].options,
                });
                sortableComponent.setState({ items: sortableComponent.itemsFromProps(newProps) });
              }
            }
          });
        }
      },
      setAnswer() {
        this.blankState = this.getSerializedState();
        // If a passed in answerState is an object with the right keys, restore.
        if (this.answerState && this.answerState.question && this.answerState.hints) {
          this.restoreSerializedState(this.answerState);
        } else if (this.showCorrectAnswer) {
          this.setCorrectAnswer();
        }
      },
      /**
       * @public
       */
      checkAnswer() {
        if (this.itemRenderer && !this.loading) {
          const check = this.itemRenderer.scoreInput();
          if (check.message && check.empty) {
            this.message = check.message;
          }
          // Even if the answer is 'empty' according to perseus, it can contain
          // meaningful state - so we should still return it.
          // The most salient example of this is multi-select multiple choice
          // where if insufficient responses have been given, this is counted
          // as 'empty'.
          const answerState = this.getSerializedState();
          // We cannot reliably get simplified answers from Perseus, so don't try.
          const simpleAnswer = '';
          return {
            correct: check.correct,
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
       * @public
       */
      takeHint() {
        if (this.itemRenderer && this.hintsVisible < this.totalHints) {
          this.hintsVisible += 1;
          this.renderItem();
          this.$emit('hintTaken', { answerState: this.getSerializedState() });
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
      loadItemData() {
        // Only try to do this if itemId is defined.
        if (this.itemId && this.defaultFile && this.defaultFile.storage_url) {
          this.loading = true;
          if (this.perseusFileUrl !== this.defaultFile.storage_url) {
            cleanUpPerseusFile(this.perseusFileUrl);
            setUpPerseusFile(this.defaultFile.storage_url);
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

  @import '~katex/dist/katex.css';
  @import '~../../dist/index.css';
  @import '~../../dist/math-input.css';

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

    .problem-area {
      padding: 0;
    }

    /deep/ .perseus-renderer {
      padding: 0;
    }
  }

  /* Perseus Hacks */

  /* The rest in this <style> block are mostly styles that
   help force Perseus exercises to render within the allotted space. */

  .framework-perseus {
    position: relative; /* Make it a positioning context */
    display: flex;
    flex-direction: column;
    height: 100%; /* Take up all available vertical space */

    // Orderer widget wrapper. Stops it from going off screen right
    /deep/ .orderer {
      min-width: 0;
    }

    // Multiple choice table padding/margin fixes for clean appearance
    /deep/ .widget-block > div {
      padding: 0 !important;
      margin: 0 !important;
    }

    /deep/ .perseus-widget-radio {
      margin: 0 !important;
    }

    /deep/ .perseus-widget-radio-fieldset {
      padding-right: 0 !important;
      padding-left: 0 !important;
    }
  }

  // try to prevent nested scroll bars
  .perseus-widget-container > div {
    overflow: visible !important;
  }

  .perseus {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 24px;
    overflow: auto; /* Allow scrolling if needed */
    background: white;
  }

  /deep/ .perseus > div {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px; /* Optional: space between the grid items */
  }

  @media (max-width: 600px) {
    /deep/ .perseus > div {
      grid-template-columns: 1fr;
    }
  }

  /deep/ .perseus {
    /* Override Perseus' responsive SVG image display which forces full width */
    .paragraph > .svg-image {
      display: inline-block;
      vertical-align: middle;
    }
  }

  /deep/ .perseus-renderer {
    padding: 16px;
  }

  /deep/ .pure-g {
    // Overrides Perseus smushing the letter spacing on mobile
    letter-spacing: inherit;
  }

</style>


<style lang="scss">

  // Reset global styles so that we don't interfere with perseus styling

  .perseus-root {
    position: relative;
    z-index: 0;
    height: 100%;

    div,
    span,
    applet,
    object,
    iframe,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    p,
    blockquote,
    pre,
    a,
    abbr,
    acronym,
    address,
    big,
    cite,
    code,
    del,
    dfn,
    em,
    img,
    ins,
    kbd,
    q,
    s,
    samp,
    small,
    strike,
    strong,
    sub,
    sup,
    tt,
    var,
    b,
    u,
    i,
    center,
    dl,
    dt,
    dd,
    ol,
    ul,
    li,
    fieldset,
    form,
    label,
    legend,
    table,
    caption,
    tbody,
    tfoot,
    thead,
    tr,
    th,
    td,
    article,
    aside,
    canvas,
    details,
    embed,
    figure,
    figcaption,
    footer,
    header,
    hgroup,
    menu,
    nav,
    output,
    ruby,
    section,
    summary,
    time,
    mark,
    audio,
    video {
      padding: 0;
      margin: 0;
      vertical-align: baseline;
    }

    /* HTML5 display-role reset for older browsers */
    article,
    aside,
    details,
    figcaption,
    figure,
    footer,
    header,
    hgroup,
    menu,
    nav,
    section {
      display: block;
    }

    ol,
    ul {
      list-style: none;
    }

    blockquote,
    q {
      quotes: none;
    }

    blockquote::before,
    blockquote::after,
    q::before,
    q::after {
      content: '';
      content: none;
    }

    table {
      border-spacing: 0;
      border-collapse: collapse;
    }

    .simple-button {
      position: relative;
      padding: 5px 10px;
      margin: 3px;
      font-family: inherit;
      line-height: 20px;
      color: #444444 !important;
      text-decoration: none !important;
      text-shadow: none;
      cursor: pointer !important;
      background-color: #e7e7e7;
      background-image: linear-gradient(to bottom, #eeeeee, #dcdcdc);
      background-repeat: repeat-x;
      border: 1px solid #e6e6e6;
      border-radius: 3px;
      transition: box-shadow ease-in-out 0.15s;
    }
  }

  .perseus-keypad-container > div > div {
    pointer-events: auto;
  }

</style>
