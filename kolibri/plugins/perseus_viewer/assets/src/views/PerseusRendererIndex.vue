<template>

  <div v-if="itemId || itemData" class="bibliotron-exercise perseus-root">
    <div class="framework-perseus" :class="{ 'perseus-mobile': isMobile }">
      <div id="perseus" ref="perseus" style="background-color: white;">
        <div class="loader-container">
          <KLinearLoader
            v-show="loading"
            :delay="false"
            type="indeterminate"
          />
        </div>
        <div
          id="problem-area"
          :dir="contentDirection"
        >
          <div id="workarea" style="margin-left: 0px"></div>
        </div>

        <div
          v-if="anyHints"
          class="hint-btn-container"
        >
          <KButton
            v-if=" availableHints > 0"
            class="hint-btn"
            appearance="basic-link"
            :text="$tr('hint', { hintsLeft: availableHints })"
            :primary="false"
            @click="takeHint"
          />
          <KButton
            v-else
            class="hint-btn"
            appearance="basic-link"
            :text="$tr('noMoreHint')"
            :primary="false"
            :disabled="true"
          />
          <CoreInfoIcon
            class="info-icon"
            tooltipPosition="bottom right"
            :iconAriaLabel="$tr('hintExplanation')"
            :tooltipText="$tr('hintExplanation')"
          />
        </div>


        <div v-if="hinted" id="hintlabel" :dir="contentDirection">
          {{ $tr("hintLabel") }}
        </div>
        <div id="hintsarea" :dir="contentDirection" style="margin-left: 0px"></div>

        <div style="clear: both;"></div>

      </div>

      <transition name="expand">
        <div v-show="message" id="message" :dir="contentDirection">
          {{ message }}
        </div>
      </transition>

      <div id="answer-area-wrap" :dir="contentDirection" style="background-color: white;">
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

  import JSZip from 'jszip';
  import client from 'kolibri.client';
  import urls from 'kolibri.urls';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import scriptLoader from 'kolibri.utils.scriptLoader';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import perseus from '../../dist/perseus';
  import icu from '../KAGlobals/icu';
  import Khan from '../KAGlobals/Khan';
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

  export default {
    name: 'PerseusRendererIndex',
    components: {
      CoreInfoIcon,
    },
    mixins: [responsiveWindowMixin],
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
      // this is a nasty hack. Will find a better way
      usesTouch() {
        // using mdn suggestion for most compatibility
        const isMobileBrowser = new RegExp(/Mobi*|Android/);
        return isMobileBrowser.test(window.navigator.userAgent);
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
      availableHints() {
        return this.itemRenderer
          ? this.itemRenderer.getNumHints() - this.itemRenderer.state.hintsVisible
          : 0;
      },
      anyHints() {
        return this.allowHints && (this.itemRenderer ? this.itemRenderer.getNumHints() : 0);
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
      this.clearItemRenderer();
      this.$emit('stopTracking');
    },
    created() {
      this.perseusFile = null;
      this.imageUrls = {};
      // Make a global reference for this object
      // for access inside perseus.
      Khan.imageUrls = this.imageUrls;
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
        for (let key in this.imageUrls) {
          if (this.imageUrls[key].indexOf('blob:') === 0) {
            URL.revokeObjectURL(this.imageUrls[key]);
          }
          delete this.imageUrls[key];
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
              const sortableComponent = this.itemRenderer.questionRenderer.getWidgetInstance(id)
                .refs.sortable;
              questionState[id].options = sortableComponent.getOptions();
            }
          }
        });
        return questionState;
      },
      getSerializedState() {
        const hints = Object.keys(this.itemRenderer.hintsRenderer.refs).map(key =>
          this.itemRenderer.hintsRenderer.refs[key].getSerializedState()
        );
        const question = this.addSorterState(
          this.itemRenderer.questionRenderer.getSerializedState()
        );
        return {
          question,
          hints,
        };
      },
      restoreSerializedState(answerState) {
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
      takeHint() {
        if (
          this.itemRenderer &&
          this.itemRenderer.state.hintsVisible < this.itemRenderer.getNumHints()
        ) {
          this.itemRenderer.showHint();
          this.$parent.$emit('hintTaken', { answerState: this.getSerializedState() });
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
      loadPerseusFile() {
        if (this.defaultFile && this.defaultFile.storage_url) {
          this.loading = true;
          if (!this.perseusFile) {
            return client({
              method: 'get',
              url: this.defaultFile.storage_url,
              responseType: 'arraybuffer',
              cacheBust: false,
            })
              .then(response => {
                return JSZip.loadAsync(response.data);
              })
              .then(perseusFile => {
                this.perseusFile = perseusFile;
              });
          } else {
            return Promise.resolve();
          }
        }
      },
      loadItemData() {
        // Only try to do this if itemId is defined.
        if (this.itemId && this.defaultFile && this.defaultFile.storage_url) {
          this.loading = true;
          this.loadPerseusFile()
            .then(() => {
              const itemDataFile = this.perseusFile.file(`${this.itemId}.json`);
              if (itemDataFile) {
                return itemDataFile.async('string');
              }
              return Promise.reject(`item data for ${this.itemId} not found`);
            })
            .then(itemResponse => {
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

              const processFile = file => {
                if (!this.imageUrls[file]) {
                  const fileData = this.perseusFile.file(file);
                  const ext = file.split('.').slice(-1)[0];
                  if (fileData) {
                    return fileData.async('arraybuffer').then(buffer => {
                      let type;
                      if (ext === 'json') {
                        type = 'application/json';
                      } else if (ext === 'svg') {
                        type = 'image/svg+xml';
                      } else {
                        type = `image/${ext}`;
                      }
                      const blob = new Blob([buffer], { type });
                      this.imageUrls[file] = URL.createObjectURL(blob);
                    });
                  } else {
                    // If the file is not present in the zip file, then fill in a missing image
                    // file for images, and an empty dummy json file for json
                    let url;
                    if (ext === 'json') {
                      url = 'data:application/json,';
                    } else {
                      url = imageMissing;
                    }
                    this.imageUrls[file] = url;
                  }
                }
                return Promise.resolve();
              };

              const promises = images.map(processFile).concat(
                graphieImages.map(image => {
                  const svgFile = `${image}.svg`;
                  const jsonFile = `${image}-data.json`;
                  return Promise.all([processFile(svgFile), processFile(jsonFile)]);
                })
              );

              return Promise.all(promises)
                .catch(() => {
                  return Promise.reject('error loading assessment item images');
                })
                .then(() => {
                  this.setItemData(
                    JSON.parse(
                      itemResponse.replace(allImageRegex, (match, g1, g2, image) => {
                        if (g1) {
                          // Replace any placeholder values for image URLs with the
                          // `web+graphie:` prefix separately from any others,
                          // as they are parsed slightly differently to standard image
                          // urls (Perseus adds the protocol in place of `web+graphie:`).
                          return `web+graphie:${image}`;
                        } else {
                          // Replace any placeholder values for image URLs with
                          // the base URL for the perseus file we are reading from
                          return this.imageUrls[image] || imageMissing;
                        }
                      })
                    )
                  );
                });
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
      showScratch: 'Show scratchpad',
      notAvailable: 'The scratchpad is not available',
      hint: 'Use a hint ({hintsLeft, number} left)',
      hintExplanation: 'If you use a hint, this question will not be added to your progress',
      hintLabel: 'Hint:',
      noMoreHint: 'No more hints',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~../../dist/khan-exercise.css';
  @import '~../../dist/katex.css';
  @import '~../../dist/perseus.css';
  @import '~../../dist/mathquill.css';

  .solutionarea {
    border: 0;
  }

  .bibliotron-exercise {
    margin-bottom: 8px;
  }

  .hint-btn-container {
    margin-top: 32px;
    text-align: right;
  }

  .hint-btn {
    vertical-align: text-bottom;
  }

  .info-icon {
    margin-left: 8px;
  }

  .loader-container {
    width: 100%;
    height: 4px;
  }

  .framework-perseus.perseus-mobile {
    margin-top: 0;
  }

</style>


<style lang="scss">

  // Reset global styles so that we don't interfere with perseus styling

  .perseus-root {
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

  // try to prevent nested scroll bars
  .perseus-widget-container > div {
    overflow: visible !important;
  }

</style>
