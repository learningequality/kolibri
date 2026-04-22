<template>

  <!-- eslint-disable vue/no-bare-strings-in-template -->
  <div class="qti-sandbox">
    <div class="qti-sandbox-header">
      <h1>QTI Sandbox</h1>
      <KButton @click="showSidePanel = true"> Select QTI Item </KButton>
    </div>

    <div class="qti-sandbox-content">
      <div class="qti-sandbox-editor">
        <h2>QTI XML</h2>
        <KCheckbox
          :checked="interactive"
          @change="interactive = !interactive"
        >
          Interactive?
        </KCheckbox>
        <textarea
          v-model="selectedXml"
          class="qti-xml-editor"
          :aria-label="$tr('qtiXmlEditorLabel')"
          placeholder="Select a QTI item from the side panel or paste XML here..."
        >
        </textarea>

        <div class="answer-state-editor">
          <h3>Answer State</h3>
          <div class="answer-state-items">
            <div
              v-for="(value, key) in currentAnswerState"
              :key="key"
              class="answer-state-item"
            >
              <span class="key-name">{{ key }}:</span>
              <input
                :value="formatAnswerValue(value)"
                class="value-input"
                @input="updateAnswerStateValue(key, $event.target.value)"
              >
            </div>
            <div
              v-if="Object.keys(currentAnswerState).length === 0"
              class="empty-state-small"
            >
              {{
                selectedXml
                  ? 'This item has no response declarations.'
                  : 'Select an item to populate the answer state.'
              }}
            </div>
          </div>
        </div>
      </div>

      <div class="qti-sandbox-preview">
        <div class="qti-preview-header">
          <h2>Preview</h2>
          <KButton
            v-if="totalHints > 0"
            class="show-hint-button"
            :disabled="availableHints === 0"
            :text="availableHints > 0 ? `Show hint (${availableHints} left)` : 'No more hints'"
            @click="takeHint"
          />
        </div>
        <div class="qti-preview-container">
          <ContentViewer
            v-if="selectedXml"
            :ref="setViewer"
            :itemData="selectedXml"
            :interactive="interactive"
            :answerState="userAnswerState"
            preset="qti"
            @startTracking="refreshOutcomes"
            @interaction="refreshOutcomes"
          />
          <div
            v-else
            class="empty-state"
          >
            Select a QTI item to see the preview
          </div>
        </div>

        <div class="outcomes-panel">
          <h3>Outcomes</h3>
          <div
            v-if="Object.keys(outcomes).length === 0"
            class="empty-state-small"
          >
            This item has no outcome declarations.
          </div>
          <div
            v-for="(value, key) in outcomes"
            v-else
            :key="key"
            class="outcome-item"
          >
            <span class="key-name">{{ key }}:</span>
            <code class="outcome-value">{{ formatOutcome(value) }}</code>
          </div>
        </div>
      </div>
    </div>

    <SidePanelModal
      v-if="showSidePanel"
      :alignment="'left'"
      @closePanel="showSidePanel = false"
    >
      <template #header>
        <h2>QTI Item Samples</h2>
      </template>

      <div class="qti-item-list">
        <AccordionContainer :multiple="true">
          <AccordionItem
            v-for="category in structure"
            :key="category.title"
            :title="category.title"
          >
            <template #content>
              <div v-if="category.items">
                <template v-for="item in category.items">
                  <div :key="item.identifier || item.title">
                    <button
                      v-if="item.identifier"
                      type="button"
                      class="qti-item"
                      @click="selectItem(item)"
                    >
                      {{ item.title }}
                    </button>
                    <AccordionItem
                      v-else-if="item.items"
                      :title="item.title"
                      class="nested-accordion"
                    >
                      <template #content>
                        <button
                          v-for="nestedItem in item.items"
                          :key="nestedItem.identifier"
                          type="button"
                          class="nested-item qti-item"
                          @click="selectItem(nestedItem)"
                        >
                          {{ nestedItem.title }}
                        </button>
                      </template>
                    </AccordionItem>
                  </div>
                </template>
              </div>
            </template>
          </AccordionItem>
        </AccordionContainer>
      </div>
    </SidePanelModal>
  </div>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import items from './__fixtures__/items';
  import structure from './__fixtures__/structure';

  /**
   * Parse a value typed into an answer-state input back into a seed value.
   * Record and container responses are surfaced as JSON, so parse those back
   * to an object/array; a plain scalar that isn't valid JSON (e.g. an
   * identifier or free-text answer) round-trips as its raw string.
   * @param {string} raw - The raw input string
   * @returns {object|string} The parsed object/array, or the original string
   */
  export function parseAnswerStateInput(raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed !== null && typeof parsed === 'object' ? parsed : raw;
    } catch {
      return raw;
    }
  }

  export default {
    name: 'QTISandboxPage',

    components: {
      SidePanelModal,
      AccordionContainer,
      AccordionItem,
    },

    data() {
      return {
        // What the user types into the answer-state inputs. Passed as the
        // :answerState prop to seed responses. Never written from
        // checkAnswer output.
        userAnswerState: {},
        // Snapshot of the live response values from the most recent
        // checkAnswer call. Drives the answer-state display and key list.
        currentAnswerState: {},
        // Snapshot of the live outcome values from the most recent
        // checkAnswer call.
        outcomes: {},
        interactive: true,
        showSidePanel: false,
        inputtedXml: '',
        structure,
        // Reactive handle to the current ContentViewer instance. $refs is not
        // reactive, so the setViewer ref callback assigns it here as the viewer
        // (un)mounts.
        viewer: null,
      };
    },

    computed: {
      itemId() {
        return this.$route.params.itemId || null;
      },
      availableHints() {
        return this.viewer?.availableHints || 0;
      },
      totalHints() {
        return this.viewer?.totalHints || 0;
      },
      selectedXml: {
        get() {
          if (this.inputtedXml) {
            return this.inputtedXml;
          }
          return items[this.itemId]?.xml || '';
        },
        set(value) {
          this.inputtedXml = value;
        },
      },
    },

    watch: {
      async selectedXml() {
        this.outcomes = {};
        this.currentAnswerState = {};
        this.userAnswerState = {};
        await this.$nextTick();
        this.refreshOutcomes();
      },
    },

    methods: {
      // Stable ref callback so its identity does not change between renders.
      // An inline arrow function would be re-created each render, making Vue
      // remove (invoke with null) then re-add the ref on every update, toggling
      // `viewer` and triggering an infinite render loop.
      setViewer(el) {
        this.viewer = el;
      },
      takeHint() {
        this.viewer?.takeHint();
      },
      selectItem(item) {
        if (item && items[item.identifier] && item.identifier !== this.itemId) {
          this.inputtedXml = '';
          this.$router.push({ name: 'QTI_SANDBOX', params: { itemId: item.identifier } });
          this.showSidePanel = false;
        }
      },
      updateAnswerStateValue(key, value) {
        this.userAnswerState = {
          ...this.userAnswerState,
          [key]: parseAnswerStateInput(value),
        };
      },
      refreshOutcomes() {
        const result = this.viewer?.checkAnswer?.();
        if (!result) return;
        this.outcomes = result.outcomes ?? {};
        // Strip QTI_CONTEXT — it rides in on the answerState payload but
        // isn't a response variable and shouldn't appear in the display.
        const responses = { ...(result.answerState ?? {}) };
        delete responses.QTI_CONTEXT;
        this.currentAnswerState = responses;
      },
      formatOutcome(value) {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'string') return JSON.stringify(value);
        if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
        return String(value);
      },
      formatAnswerValue(value) {
        if (value === null || value === undefined) return '';
        if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
        return String(value);
      },
    },

    $trs: {
      qtiXmlEditorLabel: {
        message: 'QTI XML editor',
        context:
          'Accessible label for the QTI XML code editor textarea in the QTI sandbox developer tool',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .qti-sandbox {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 2rem;
  }

  .qti-sandbox-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;

    h1 {
      margin: 0;
    }
  }

  .qti-sandbox-content {
    display: grid;
    flex: 1;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    min-height: 0;
  }

  .qti-sandbox-editor,
  .qti-sandbox-preview {
    display: flex;
    flex-direction: column;

    h2 {
      margin: 0 0 1rem;
    }
  }

  .qti-preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;

    h2 {
      margin: 0;
    }
  }

  .qti-xml-editor {
    flex: 1;
    padding: 1rem;
    font-family: monospace;
    resize: none;
    border: 1px solid #cccccc;
    border-radius: 4px;
  }

  .answer-state-editor {
    padding: 0.75rem;
    margin-top: 1rem;
    background-color: #fafafa;
    border: 1px solid #dddddd;
    border-radius: 4px;

    h3 {
      margin: 0 0 0.5rem;
      font-size: 0.9rem;
      color: #555555;
    }
  }

  .answer-state-items {
    max-height: 120px;
    overflow-y: auto;
  }

  .answer-state-item {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.375rem;
    margin-bottom: 0.5rem;
    background-color: white;
    border: 1px solid #e0e0e0;
    border-radius: 3px;

    .key-name {
      min-width: 60px;
      font-size: 0.8rem;
      font-weight: 500;
      color: #666666;
    }

    .value-input {
      flex: 1;
      padding: 0.25rem 0.375rem;
      font-size: 0.8rem;
      border: 1px solid #cccccc;
      border-radius: 2px;
    }
  }

  .empty-state-small {
    padding: 0.5rem;
    font-size: 0.8rem;
    font-style: italic;
    color: #999999;
    text-align: center;
  }

  .qti-preview-container {
    flex: 1;
    padding: 1rem;
    overflow: auto;
    background-color: white;
    border: 1px solid #cccccc;
    border-radius: 4px;
  }

  .outcomes-panel {
    padding: 0.75rem;
    margin-top: 1rem;
    background-color: #fafafa;
    border: 1px solid #dddddd;
    border-radius: 4px;

    h3 {
      margin: 0 0 0.5rem;
      font-size: 0.9rem;
      color: #555555;
    }
  }

  .outcome-item {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.375rem;
    margin-bottom: 0.375rem;
    background-color: white;
    border: 1px solid #e0e0e0;
    border-radius: 3px;

    .key-name {
      min-width: 80px;
      font-size: 0.8rem;
      font-weight: 500;
      color: #666666;
    }

    .outcome-value {
      flex: 1;
      padding: 0.25rem 0.375rem;
      font-family: monospace;
      font-size: 0.8rem;
      color: #333333;
      background-color: #f5f5f5;
      border-radius: 2px;
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-style: italic;
    color: #666666;
  }

  .qti-item-list {
    padding: 1rem;

    .nested-accordion {
      margin-left: 1rem;
    }
  }

  .qti-item {
    display: block;
    width: 100%;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 500;
    line-height: 1.3;
    color: inherit;
    text-align: start;
    cursor: pointer;
    background: transparent;
    border: 1px solid #dddddd;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f5f5;
    }

    &.nested-item {
      padding: 0.5rem;
      margin-left: 1rem;
      font-size: 0.8rem;
      font-weight: 400;
      color: #555555;
      background-color: #fafafa;

      &:hover {
        background-color: #f0f0f0;
      }
    }

    p {
      margin: 0;
      color: #666666;
    }
  }

</style>
