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
          placeholder="Select a QTI item from the side panel or paste XML here..."
        >
        </textarea>

        <div class="answer-state-editor">
          <h3>Answer State</h3>
          <div class="answer-state-controls">
            <KButton
              size="small"
              :disabled="!newKeyName"
              @click="addAnswerStateKey"
            >
              Add Key
            </KButton>
            <input
              v-model="newKeyName"
              placeholder="Key name"
              class="key-input"
              @keyup.enter="addAnswerStateKey"
            >
          </div>
          <div class="answer-state-items">
            <div
              v-for="(value, key) in answerState"
              :key="key"
              class="answer-state-item"
            >
              <span class="key-name">{{ key }}:</span>
              <input
                :value="value"
                class="value-input"
                @input="updateAnswerStateValue(key, $event.target.value)"
              >
              <KIconButton
                icon="close"
                size="small"
                @click="removeAnswerStateKey(key)"
              />
            </div>
            <div
              v-if="Object.keys(answerState).length === 0"
              class="empty-state-small"
            >
              No answer state keys
            </div>
          </div>
        </div>
      </div>

      <div class="qti-sandbox-preview">
        <h2>Preview</h2>
        <div class="qti-preview-container">
          <ContentViewer
            v-if="selectedXml"
            :itemData="selectedXml"
            :interactive="interactive"
            :answerState="answerState"
            preset="qti"
          />
          <div
            v-else
            class="empty-state"
          >
            Select a QTI item to see the preview
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
                    <div
                      v-if="item.identifier"
                      class="qti-item"
                      @click="selectItem(item)"
                    >
                      <h4>{{ item.title }}</h4>
                    </div>
                    <AccordionItem
                      v-else-if="item.items"
                      :title="item.title"
                      class="nested-accordion"
                    >
                      <template #content>
                        <div
                          v-for="nestedItem in item.items"
                          :key="nestedItem.identifier"
                          class="nested-item qti-item"
                          @click="selectItem(nestedItem)"
                        >
                          <h5>{{ nestedItem.title }}</h5>
                        </div>
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

  export default {
    name: 'QTISandboxPage',

    components: {
      SidePanelModal,
      AccordionContainer,
      AccordionItem,
    },

    data() {
      return {
        answerState: {},
        interactive: true,
        showSidePanel: false,
        inputtedXml: '',
        structure,
        newKeyName: '',
      };
    },

    computed: {
      itemId() {
        return this.$route.params.itemId || null;
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

    methods: {
      selectItem(item) {
        if (item && items[item.identifier] && item.identifier !== this.itemId) {
          this.inputtedXml = '';
          this.$router.push({ name: 'QTI_SANDBOX', params: { itemId: item.identifier } });
          this.showSidePanel = false;
        }
      },
      addAnswerStateKey() {
        if (this.newKeyName && !this.answerState[this.newKeyName]) {
          this.answerState = {
            ...this.answerState,
            [this.newKeyName]: '',
          };
          this.newKeyName = '';
        }
      },
      removeAnswerStateKey(key) {
        const newState = { ...this.answerState };
        delete newState[key];
        this.answerState = newState;
      },
      updateAnswerStateValue(key, value) {
        this.answerState = {
          ...this.answerState,
          [key]: value,
        };
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

  .answer-state-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.75rem;

    .key-input {
      flex: 1;
      padding: 0.375rem 0.5rem;
      font-size: 0.85rem;
      border: 1px solid #cccccc;
      border-radius: 3px;
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
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    cursor: pointer;
    border: 1px solid #dddddd;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f5f5;
    }

    &.nested-item {
      padding: 0.5rem;
      margin-left: 1rem;
      background-color: #fafafa;

      &:hover {
        background-color: #f0f0f0;
      }
    }

    h3,
    h4,
    h5 {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.3;
    }

    h4 {
      font-size: 0.85rem;
      font-weight: 500;
    }

    h5 {
      font-size: 0.8rem;
      font-weight: 400;
      color: #555555;
    }

    p {
      margin: 0;
      color: #666666;
    }
  }

</style>
