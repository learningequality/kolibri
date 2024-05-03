<template>

  <div
    v-if="itemId || itemData"
    class="bibliotron-exercise perseus-root"
    :class="{ 'perseus-mobile': isMobile }"
  >
    <div class="framework-perseus" :style="{ margin: isMobile ? '0' : '0 24px' }">
      <div id="perseus" ref="perseus" class="perseus">
        <div class="loader-container">
          <KLinearLoader
            v-show="loading"
            :delay="false"
            type="indeterminate"
          />
        </div>
        <KGrid>
          <!-- Layout notes
            - Layout12 span8 -> ~66% width on windowIsLarge
            - No other layout definitions means span will be 100%
            - If we're not allowingHints, then it should be 100% because
              they're the reason we'd go smaller at all
          -->
          <KGridItem :layout12="{ span: allowHints && interactive ? 6 : 12 }">
            <div
              id="problem-area"
              class="problem-area"
              :dir="contentDirection"
            >
              <div id="workarea" style="margin-left: 0px; margin-right: 0px;"></div>
            </div>
          </KGridItem>

          <!--
              - Hide when not allowing hints
              - It is a v-show because seems without the proper anchors in place
                it will fail to properly mount the react component
          -->
          <KGridItem v-show="interactive && allowHints" :layout12="{ span: 6 }">
            <div v-if="hinted" id="hintlabel" class="hintlabel" :dir="contentDirection">
              {{ $tr("hintLabel") }}
            </div>
            <div id="hintsarea" class="hintsarea" :dir="contentDirection"></div>
          </KGridItem>
        </KGrid>
      </div>

      <transition name="expand">
        <div v-show="message" id="message" :dir="contentDirection">
          {{ message }}
        </div>
      </transition>

      <div id="answer-area-wrap" :dir="contentDirection">
        <div id="answer-area">
          <div class="info-box">
            <div id="solutionarea" class="solutionarea"></div>
          </div>
        </div>
      </div>

      <KButton
        v-if="scratchpad"
        id="scratchpad-show"
        :primary="false"
        :raised="false"
        :text="$tr('showScratch')"
      />
      <KButton
        v-else
        id="scratchpad-not-available"
        :primary="false"
        :raised="false"
        disabled
        :text="$tr('notAvailable')"
      />

      <!-- Need a DOM mount point for ReactDOM to attach to,
        but Perseus renders weirdly so doesn't use this -->
      <div id="perseus-container" ref="perseusContainer" :dir="contentDirection"></div>
    </div>
  </div>

</template>


<script>

  import invert from 'lodash/invert';
  import ZipFile from 'kolibri-zip';
  import { Mapper, defaultFilePathMappers } from 'kolibri-zip/src/fileUtils';
  import urls from 'kolibri.urls';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { isTouchDevice, isMouseUsed } from 'kolibri.utils.browserInfo';
  import scriptLoader from 'kolibri-common/utils/scriptLoader';
  import perseus from '../../dist/perseus';
  import icu from '../KAGlobals/icu';
  import Khan from '../KAGlobals/Khan';
  // Import this here so that our string translation machinery
  // is aware of the dependency, as otherwise the functions in here are only
  // referenced via WebpackProvidePlugin
  import '../i18n';
  import widgetSolver from '../widgetSolver';
  import imageMissing from './image_missing.svg';

  // A handy convenience mapping to what is essentially a constructor for Item Renderer
  // components.
  const itemRendererFactory = perseus.React.createFactory(perseus.ItemRenderer);

  const logging = require('kolibri.lib.logging').getLogger(__filename);

  // because MathJax isn't compatible with webpack, we are loading it this way.
  const mathJaxConfigFileName = require('../constants').ConfigFileName;
  // the config is fragile, Khan may change it and we need to update the following hardcoded path.
  const mathJaxUrl = urls.static(`mathjax/2.1/MathJax.js?config=${mathJaxConfigFileName}`);

  const mathJaxPromise = scriptLoader(mathJaxUrl);

  const sorterWidgetRegex = /sorter [0-9]+/;

  // Regex for all images, we use the differential matches in the first matching
  // group to determine if it's a graphie image or a regular image.
  const allImageRegex = /((web\+graphie:)?)\$\{☣ LOCALPATH\}\/([^)^"]+)/g;

  const blobImageRegex = /blob:[^)^"]+/g;

  Khan.imageUrls = {};

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
      []
    );
    return images.concat(svgAndJson);
  }

  function replaceImageUrls(itemResponse, packageFiles) {
    Object.assign(Khan.imageUrls, packageFiles);
    // If the file is not present in the zip file, then fill in a missing image
    // file for images, and an empty dummy json file for json
    return itemResponse.replace(allImageRegex, (match, g1, g2, image) => {
      if (g1) {
        // Replace any placeholder values for image URLs with the
        // `web+graphie:` prefix separately from any others,
        // as they are parsed slightly differently to standard image
        // urls (Perseus adds the protocol in place of `web+graphie:`).
        if (!Khan.imageUrls[image]) {
          Khan.imageUrls[image] = 'data:application/json,';
        }
        return `web+graphie:${image}`;
      } else {
        // Replace any placeholder values for image URLs with
        // the base URL for the perseus file we are reading from
        return packageFiles[image] || imageMissing;
      }
    });
  }

  class JSONMapper extends Mapper {
    getPaths() {
      return getImagePaths(this.file.toString());
    }
    replacePaths(packageFiles) {
      return replaceImageUrls(this.file.toString(), packageFiles);
    }
  }

  const filePathMappers = {
    ...defaultFilePathMappers,
    json: JSONMapper,
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
      // Is the perseus item renderer loading?
      loading: true,
      // state about the answer
      message: null,
      // default item data
      item: {},
      itemRenderer: null,
      scratchpad: false,
      // Store a copy of the blank state of a question to clear set answers later
      blankState: null,
    }),
    computed: {
      isMobile() {
        return this.windowBreakpoint < 3;
      },
      usesTouch() {
        return isTouchDevice && !isMouseUsed;
      },
      itemRenderData() {
        return {
          // A property to return data formatted in the form expected by the Item Renderer
          // constructor function.
          initialHintsVisible: 0,
          item: this.item,
          workAreaSelector: '#workarea',
          problemAreaSelector: '#problem-area',
          problemNum: Math.floor(Math.random() * 1000),
          enabledFeatures: {
            highlight: true,
            toolTipFormats: true,
          },
          apiOptions: {
            // Pass in callbacks for widget interaction and focus change.
            // Here we dismiss answer error message on interaction and focus change.
            interactionCallback: this.interactionCallback,
            onFocusChange: this.dismissMessage,
            isMobile: this.isMobile,
            customKeypad: this.usesTouch,
            readOnly: !this.interactive,
          },
        };
      },
      hinted() {
        return this.itemRenderer ? this.itemRenderer.state.hintsVisible > 0 : false;
      },
      /* eslint-disable kolibri/vue-no-unused-properties */
      availableHints() {
        /* eslint-enable */
        return (this.itemRenderer && this.totalHints - this.itemRenderer.state.hintsVisible) || 0;
      },
      totalHints() {
        return this.itemRenderer ? this.itemRenderer.getNumHints() : 0;
      },
    },
    watch: {
      itemId() {
        this.loadItemData();
      },
      itemData(newItemData) {
        this.setItemData(newItemData);
      },
      loading() {
        this.setAnswer();
      },
      answerState(newState) {
        this.resetState(newState);
      },
      showCorrectAnswer(newVal) {
        this.resetState(newVal);
      },
    },
    beforeCreate() {
      icu.setIcuSymbols();
    },

    beforeDestroy() {
      this.$emit('stopTracking');
      this.clearItemRenderer();
      if (this.perseusFile) {
        this.perseusFile.close();
      }
    },
    created() {
      this.perseusFile = null;
      const initPromise = mathJaxPromise.then(() =>
        perseus.init({ skipMathJax: true, loadExtraWidgets: true })
      );
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
            true
          ) &&
          // Check that the 'hints' property is an Array.
          Array.isArray(obj.hints) &&
          obj.hints.reduce(
            // Check that each hint in the hints array is an object (and not null)
            (prev, item) => item && typeof item === 'object',
            true
          ) &&
          // Check that the question property is an object (and not null)
          obj.question &&
          typeof obj.question === 'object'
        );
        /* eslint-enable no-mixed-operators */
      },
      renderItem() {
        // Reset the state tracking variables.
        this.loading = true;
        // Don't store blank state for another item.
        this.blankState = null;

        // Clear any currently displayed messages when we render an item.
        this.dismissMessage();

        // Create react component with current item data.
        // If the component already existed, this will perform an update.
        this.$set(
          this,
          'itemRenderer',
          perseus.ReactDOM.render(
            itemRendererFactory(this.itemRenderData, null),
            this.$refs.perseusContainer,
            () => {
              this.loading = false;
            }
          )
        );
      },
      resetState(val) {
        if (!val) {
          this.restoreSerializedState(this.blankState);
        }
        this.setAnswer();
      },
      clearItemRenderer() {
        // Clean up any existing itemRenderer to avoid leak memory
        // https://facebook.github.io/react/blog/2015/10/01/react-render-and-top-level-api.html
        // Nest this in a try catch block so that we can call this method aggressively
        // to ensure clean up without worrying about whether React has already cleaned up this
        // component.
        try {
          perseus.ReactDOM.unmountComponentAtNode(this.$refs.perseusContainer);
          this.$set(this, 'itemRenderer', null);
        } catch (e) {
          logging.debug('Error during unmounting of item renderer', e);
        }
        Khan.imageUrls = {};
      },
      /*
       * Special method to extract the current state of a Perseus Sorter widget
       * as it does not currently properly support getSerializedState
       */
      addSorterState(questionState) {
        this.itemRenderer.getWidgetIds().forEach(id => {
          if (sorterWidgetRegex.test(id)) {
            if (questionState[id]) {
              const sortableComponent = this.itemRenderer.questionRenderer.getWidgetInstance(id)
                .refs.sortable;
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
            this.itemRenderer.hintsRenderer.refs[key].getSerializedState()
          );
        }
        const question = this.addSorterState(
          this.itemRenderer.questionRenderer.getSerializedState()
        );
        // To prevent propagation of our locally replace blob URLs into answers,
        // we need to replace them with the original URLs.
        return this.restoreImageUrls({ hints, question });
      },
      restoreSerializedState(answerState) {
        answerState = JSON.parse(replaceImageUrls(JSON.stringify(answerState)));
        this.itemRenderer.restoreSerializedState(answerState);
        this.itemRenderer.getWidgetIds().forEach(id => {
          if (sorterWidgetRegex.test(id)) {
            if (answerState.question[id]) {
              const sortableComponent = this.itemRenderer.questionRenderer.getWidgetInstance(id)
                .refs.sortable;
              const newProps = Object.assign({}, sortableComponent.props, {
                options: answerState.question[id].options,
              });
              sortableComponent.setState({ items: sortableComponent.itemsFromProps(newProps) });
            }
          }
        });
      },
      setAnswer() {
        this.blankState = this.getSerializedState();
        // If a passed in answerState is an object with the right keys, restore.
        if (
          this.itemRenderer &&
          this.answerState &&
          this.answerState.question &&
          this.answerState.hints &&
          !this.loading
        ) {
          this.restoreSerializedState(this.answerState);
        } else if (this.showCorrectAnswer && !this.loading) {
          this.setCorrectAnswer();
        } else if (this.itemRenderer && !this.loading) {
          // Not setting an answer state, but need to hide any hints.
          this.itemRenderer.setState({
            hintsVisible: 0,
          });
        }
      },
      /*
       * @public
       */
      checkAnswer() {
        if (this.itemRenderer && !this.loading) {
          const check = this.itemRenderer.scoreInput();
          this.empty = check.empty;
          if (check.message && check.empty) {
            this.message = check.message;
          } else if (!check.empty) {
            const answerState = this.getSerializedState();
            // We cannot reliably get simplified answers from Perseus, so don't try.
            const simpleAnswer = '';
            return {
              correct: check.correct,
              answerState,
              simpleAnswer,
            };
          }
        }
        return null;
      },
      /*
       * @public
       */
      takeHint() {
        if (
          this.itemRenderer &&
          this.itemRenderer.state.hintsVisible < this.itemRenderer.getNumHints()
        ) {
          this.itemRenderer.showHint();
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
          if (!this.perseusFile || this.perseusFileUrl !== this.defaultFile.storage_url) {
            this.perseusFile = new ZipFile(this.defaultFile.storage_url, {
              filePathMappers,
            });
            this.perseusFileUrl = this.defaultFile.storage_url;
          }
          this.perseusFile
            .file(`${this.itemId}.json`)
            .then(itemFile => {
              const itemResponse = itemFile.toString();
              this.setItemData(JSON.parse(itemResponse));
            })
            .catch(reason => {
              logging.debug('There was an error loading the assessment item data: ', reason);
              this.clearItemRenderer();
              this.$emit('itemError', reason);
            });
        }
      },
      restoreImageUrls(itemResponse) {
        const lookup = invert(Khan.imageUrls);
        return JSON.parse(
          JSON.stringify(itemResponse).replace(blobImageRegex, match => {
            // Make sure to add our prefix back in
            return '${☣ LOCALPATH}/' + lookup[match] || '';
          })
        );
      },
      setItemData(itemData) {
        if (this.validateItemData(itemData)) {
          this.item = itemData;
          if (this.$el) {
            // Don't try to render if our component is not mounted yet.
            this.renderItem();
          } else {
            this.$once('mounted', this.renderItem);
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

    $trs: {
      showScratch: {
        message: 'Show scratchpad',
        context:
          'The scratchpad refers to the interactive area in an exercise where the learner responds to a question.',
      },
      notAvailable: {
        message: 'The scratchpad is not available',
        context:
          'The scratchpad refers to the interactive area in an exercise where the learner responds to a question. On some devices the scratchpad may not be available. If this is the case, this message is displayed to the learner.',
      },
      hintLabel: {
        message: 'Hint:',
        context: 'A hint is a suggestion to help learners solve a problem.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~../../dist/khan-exercise.css';
  @import '~../../dist/katex.css';
  @import '~../../dist/perseus.css';
  @import '~../../dist/mathquill.css';

  /deep/ .perseus-hint-renderer {
    padding-left: 16px;
    border-left-style: none;
  }

  /deep/ .perseus-hint-label {
    margin-left: 16px;
  }

  .solutionarea {
    max-width: 100%;
    padding: 0 !important;
    margin: 0 !important;
    border-bottom-style: none !important;
  }

  .hintlabel {
    margin-left: 16px;
  }

  .hintsarea {
    padding-right: 16px;
  }

  .info-icon {
    margin: 0 8px;
  }

  .loader-container {
    width: 100%;
    height: 4px;
  }

  .problem-area {
    padding: 0 16px;
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
    padding-bottom: 104px;

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
    padding: 24px;
    background: white;
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

  .keypad-container {
    direction: ltr;
  }

</style>
