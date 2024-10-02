<template>

  <AppBarPage>
    <KPageContainer>
      <h2>Test 1</h2>
      <AccordionContainer style="width: 600px">
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between">
            <div>
              <KIcon
                icon="practiceSolid"
                style="margin-right: 16px"
              />
              <span>Identify Molecular formulas</span>
            </div>
            <KIconButton icon="minus" />
          </div>
        </template>
        <template #default>
          <AccordionItem
            title="What is the molecular formula for glucose?"
            :contentAppearanceOverrides="{ paddingTop: 0 }"
          >
            <template #trailing-actions>
              <KIconButton icon="minus" />
            </template>
            <template #content>
              <div
                class="inner-content-1"
                :style="{
                  borderColor: $themeTokens.fineLine,
                }"
              >
                This is just some text inside
              </div>
            </template>
          </AccordionItem>
          <AccordionItem
            title="What is the molecular formula for glucose?"
            :contentAppearanceOverrides="{ paddingTop: 0 }"
          >
            <template #trailing-actions>
              <KIconButton icon="minus" />
            </template>
            <template #content>
              <div
                class="inner-content-1"
                :style="{
                  borderColor: $themeTokens.fineLine,
                }"
              >
                This is just some text inside
              </div>
            </template>
          </AccordionItem>
        </template>
      </AccordionContainer>
    </KPageContainer>
    <KPageContainer>
      <h2>Test 2</h2>
      <AccordionContainer style="width: 600px">
        <template #header="{ canExpandAll, expandAll, canCollapseAll, collapseAll }">
          <div style="display: flex; align-items: center; justify-content: space-between">
            <KCheckbox label="Identify Molecular formulas" />
            <div style="display: flex; align-items: center">
              <KIconButton
                icon="expandAll"
                :disabled="!canExpandAll"
                @click="expandAll"
              />
              <KIconButton
                icon="collapseAll"
                :disabled="!canCollapseAll"
                @click="collapseAll"
              />
            </div>
          </div>
        </template>
        <template #default>
          <AccordionItem
            title="What is the molecular formula for glucose?"
            :contentAppearanceOverrides="{ paddingTop: 0 }"
          >
            <template #leading-actions>
              <KCheckbox />
            </template>
            <template #content>
              <div
                class="inner-content-1"
                :style="{
                  borderColor: $themeTokens.fineLine,
                }"
              >
                This is just some text inside
              </div>
            </template>
          </AccordionItem>
          <AccordionItem
            title="What is the molecular formula for glucose?"
            :contentAppearanceOverrides="{ paddingTop: 0 }"
          >
            <template #leading-actions>
              <KCheckbox />
            </template>
            <template #content>
              <div
                class="inner-content-1"
                :style="{
                  borderColor: $themeTokens.fineLine,
                }"
              >
                This is just some text inside
              </div>
            </template>
          </AccordionItem>
        </template>
      </AccordionContainer>
    </KPageContainer>
    <KPageContainer style="width: 300px">
      <h2>Test 3</h2>
      <AccordionContainer style="box-shadow: none">
        <AccordionItem
          title="Section 1 title"
          style="border-bottom: 0"
          :headerAppearanceOverrides="{
            backgroundColor: $themePalette.grey.v_50,
            padding: '8px 20px',
            fontWeight: 700,
            color: $themePalette.grey.v_600,
          }"
        >
          <template #content>
            <div style="padding: 16px 8px">
              <KIcon
                icon="dot"
                color="lightblue"
                style="margin-right: 16px"
              />
              <span>Question 1</span>
            </div>
            <div style="padding: 16px 8px">
              <KIcon
                icon="dot"
                color="lightgray"
                style="margin-right: 16px"
              />
              <span>Question 2</span>
            </div>
            <div style="padding: 16px 8px">
              <KIcon
                icon="dot"
                color="lightgray"
                style="margin-right: 16px"
              />
              <span>Question 3</span>
            </div>
          </template>
        </AccordionItem>
        <AccordionItem
          title="Section 2 title"
          style="border-bottom: 0"
          :headerAppearanceOverrides="{
            backgroundColor: $themePalette.grey.v_50,
            padding: '8px 20px',
            fontWeight: 700,
            color: $themePalette.grey.v_600,
          }"
        >
          <template #content>
            <div style="padding: 16px 8px">
              <KIcon
                icon="dot"
                color="lightblue"
                style="margin-right: 16px"
              />
              <span>Question 1</span>
            </div>
            <div style="padding: 16px 8px">
              <KIcon
                icon="dot"
                color="lightgray"
                style="margin-right: 16px"
              />
              <span>Question 2</span>
            </div>
            <div style="padding: 16px 8px">
              <KIcon
                icon="dot"
                color="lightgray"
                style="margin-right: 16px"
              />
              <span>Question 3</span>
            </div>
          </template>
        </AccordionItem>
      </AccordionContainer>
    </KPageContainer>
    <KPageContainer>
      <h2>Test 4</h2>
      <AccordionContainer style="width: 600px; margin-bottom: 32px">
        <AccordionItem
          title="Level"
          :headerAppearanceOverrides="{
            backgroundColor: '#ECF0FE',
            borderColor: '#4368F5',
            borderLeft: '4px solid #4368F5',
          }"
        >
          <template #content>
            <div>
              <KRadioButtonGroup>
                <KRadioButton label="Lower primary" />
                <KRadioButton label="Lower secondary" />
                <KRadioButton label="Preschool" />
                <KRadioButton label="Tertiary" />
              </KRadioButtonGroup>
            </div>
          </template>
        </AccordionItem>
      </AccordionContainer>
      <AccordionContainer style="width: 600px">
        <AccordionItem
          title="Level"
          :headerAppearanceOverrides="{
            backgroundColor: '#ECF0FE',
            borderColor: '#4368F5',
            borderLeft: '4px solid #4368F5',
          }"
        >
          <template #content>
            <div>
              <KRadioButtonGroup>
                <KRadioButton label="Lower primary" />
                <KRadioButton label="Lower secondary" />
                <KRadioButton label="Preschool" />
                <KRadioButton label="Tertiary" />
              </KRadioButtonGroup>
            </div>
          </template>
        </AccordionItem>
      </AccordionContainer>
    </KPageContainer>
    <KPageContainer>
      <h2>Test 5</h2>
      <AccordionContainer style="width: 600px; margin-bottom: 32px">
        <AccordionItem
          title="Category"
          :headerAppearanceOverrides="{
            backgroundColor: $themePalette.grey.v_50,
            borderBottom: `1px solid ${$themeTokens.fineLine}`,
          }"
          :contentAppearanceOverrides="{
            padding: '0',
          }"
        >
          <template #content>
            <AccordionContainer style="padding: 0; box-shadow: none">
              <AccordionItem
                title="School"
                style="padding: 0; border: 0"
              >
                <template #leading-actions>
                  <KIcon
                    icon="skillsResource"
                    style="margin-right: 10px"
                    color="blue"
                  />
                </template>
                <template #content>
                  <span> Some content here</span>
                </template>
              </AccordionItem>
              <AccordionItem
                title="Basic skills"
                style="padding: 0; border: 0"
              >
                <template #leading-actions>
                  <KIcon
                    icon="mathematicsResource"
                    style="margin-right: 10px"
                    color="blue"
                  />
                </template>
                <template #content>
                  <span> Some content here</span>
                </template>
              </AccordionItem>
            </AccordionContainer>
          </template>
        </AccordionItem>
      </AccordionContainer>
    </KPageContainer>
    <KPageContainer>
      <h2>Test 6</h2>
      <AccordionContainer style="width: 600px">
        <AccordionItem
          title="Category"
          disabled
          :headerAppearanceOverrides="{
            backgroundColor: $themePalette.grey.v_50,
            borderBottom: `1px solid ${$themeTokens.fineLine}`,
          }"
        >
          <template #content> Some content here </template>
        </AccordionItem>
      </AccordionContainer>
    </KPageContainer>
  </AppBarPage>

</template>


<script>

  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';

  export default {
    name: 'Playground',
    components: {
      AppBarPage,
      AccordionContainer,
      AccordionItem,
    },
  };

</script>


<style scoped>

  .inner-content-1 {
    padding: 10px;
    border-top: 1px solid;
  }

</style>
