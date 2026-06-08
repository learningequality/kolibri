<template>

  <SideBar :class="['epub-sidebar', getClassByWindowSize]">
    <div class="sidebar-titlebar">
      <h2>{{ sideBarTitle$() }}</h2>
      <KIconButton
        :ariaLabel="closeSideBar$()"
        icon="close"
        @click="$emit('closeSideBar')"
      />
    </div>

    <hr >

    <div class="o-f-h">
      <h3>{{ textSize$() }}</h3>
      <KFixedGrid
        numCols="2"
        gutter="8"
      >
        <KFixedGridItem span="1">
          <KButton
            ref="decreaseFontSizeButton"
            :class="['settings-button', $computedClass(settingsButtonFocus)]"
            :disabled="decreaseFontSizeDisabled"
            @click="$emit('decreaseFontSize')"
          >
            <template #icon>
              <KIcon
                icon="minus"
                class="font-size-icon"
              />
            </template>
            <div class="truncate">
              {{ decrease$() }}
            </div>
          </KButton>
        </KFixedGridItem>
        <KFixedGridItem span="1">
          <KButton
            ref="increaseFontSizeButton"
            :disabled="increaseFontSizeDisabled"
            :class="['settings-button', $computedClass(settingsButtonFocus)]"
            @click="$emit('increaseFontSize')"
          >
            <template #icon>
              <KIcon
                icon="plus"
                class="font-size-icon"
              />
            </template>
            <div class="truncate">
              {{ increase$() }}
            </div>
          </KButton>
        </KFixedGridItem>
      </KFixedGrid>
    </div>

    <hr >

    <div class="o-f-h">
      <h3>{{ theme$() }}</h3>
      <KFixedGrid
        numCols="3"
        gutter="16"
      >
        <KFixedGridItem
          v-for="(value, key) in themes"
          :key="key"
          span="1"
        >
          <KButton
            class="settings-button theme-button"
            :aria-label="generateThemeAriaLabel(key)"
            :appearanceOverrides="generateStyle(value)"
            :text="generateThemeName(key)"
            @click="$emit('setTheme', value)"
          >
            <div class="default-theme-selected">
              <KIcon
                v-if="isCurrentlySelectedTheme(value)"
                icon="check"
                :style="{ fill: value.textColor }"
                class="default-theme-selected-icon"
              />
            </div>
          </KButton>
        </KFixedGridItem>
      </KFixedGrid>
    </div>

    <hr >

    <div class="o-f-h">
      <h3>{{ customTheme$() }}</h3>

      <div>
        <CustomThemeItem
          v-for="(value, key) in customThemes"
          :ref="instance => setCustomThemeItemRef(key, instance)"
          :key="key"
          :theme="value"
          :isApplied="isCurrentlySelectedTheme(value)"
          @setCustomTheme="$emit('setTheme', value)"
          @deleteCustomTheme="themeToDelete = value"
          @editCustomTheme="startEditCustomTheme(value)"
        />

        <!-- Button to add a new custom theme -->
        <KFixedGrid
          numCols="3"
          gutter="16"
        >
          <KFixedGridItem
            v-if="canAddCustomTheme"
            span="3"
          >
            <KButton
              ref="addCustomThemeButton"
              class="settings-button theme-button"
              :aria-label="addNewTheme$()"
              :text="addNewTheme$()"
              :icon="'plus'"
              @click="newThemeName = generateNewThemeName()"
            />
          </KFixedGridItem>
        </KFixedGrid>
      </div>

      <!-- Modal to confirm deletion of a custom theme -->
      <DeleteCustomThemeModal
        v-if="themeToDelete"
        :themeName="themeToDelete.name"
        @submit="deleteTheme(themeToDelete)"
        @cancel="themeToDelete = null"
      />

      <!-- Modal to configure a custom theme -->
      <AddEditCustomThemeModal
        v-if="newThemeName || editingTheme"
        :modalMode="newThemeName ? 'add' : 'edit'"
        :theme="newThemeName ? theme : editingTheme"
        :themeName="newThemeName ? newThemeName : editingTheme.name"
        @submit="newThemeName ? createTheme($event) : updateTheme($event)"
        @cancel="newThemeName ? cancelAdd() : cancelEdit()"
      />
    </div>
  </SideBar>

</template>


<script>

  import { ref, computed, nextTick } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useCustomThemes from '../composables/useCustomThemes';
  import { THEMES, MAX_CUSTOM_THEMES } from './EpubConstants';
  import { customThemeStrings } from './customThemeStrings';
  import { settingsSideBarStrings } from './settingsSideBarStrings';
  import SideBar from './SideBar';
  import DeleteCustomThemeModal from './DeleteCustomThemeModal.vue';
  import AddEditCustomThemeModal from './AddEditCustomThemeModal.vue';
  import CustomThemeItem from './CustomThemeItem.vue';

  export default {
    name: 'SettingsSideBar',
    components: {
      SideBar,
      DeleteCustomThemeModal,
      AddEditCustomThemeModal,
      CustomThemeItem,
    },
    setup(props, { emit }) {
      const { windowIsLarge, windowIsMedium, windowIsSmall } = useKResponsiveWindow();
      const { customThemes, createCustomTheme, updateCustomTheme, removeCustomTheme } =
        useCustomThemes();
      const { defaultThemeName$ } = customThemeStrings;
      const {
        sideBarTitle$,
        closeSideBar$,
        textSize$,
        decrease$,
        increase$,
        theme$,
        customTheme$,
        addNewTheme$,
        whiteTheme$,
        beigeTheme$,
        greyTheme$,
        blackTheme$,
        yellowTheme$,
        blueTheme$,
        setWhiteTheme$,
        setBeigeTheme$,
        setGreyTheme$,
        setBlackTheme$,
        setYellowTheme$,
        setBlueTheme$,
      } = settingsSideBarStrings;
      // THEMES keys are internal constants, so both the visible label and the
      // aria label come from translated strings keyed off them.
      const themeStrings = {
        WHITE: { name$: whiteTheme$, ariaLabel$: setWhiteTheme$ },
        BEIGE: { name$: beigeTheme$, ariaLabel$: setBeigeTheme$ },
        GREY: { name$: greyTheme$, ariaLabel$: setGreyTheme$ },
        BLACK: { name$: blackTheme$, ariaLabel$: setBlackTheme$ },
        YELLOW: { name$: yellowTheme$, ariaLabel$: setYellowTheme$ },
        BLUE: { name$: blueTheme$, ariaLabel$: setBlueTheme$ },
      };

      // theme object pending deletion (null when no confirmation is open)
      const themeToDelete = ref(null);
      // theme object currently being edited (null when not editing)
      const editingTheme = ref(null);
      // default name for a theme being added (null when not adding)
      const newThemeName = ref(null);

      // Add-theme button, focused after a theme is created/deleted or the add modal closes.
      const addCustomThemeButton = ref(null);
      // CustomThemeItem instances keyed by theme id, for restoring focus after edit.
      const customThemeItemRefs = {};
      function setCustomThemeItemRef(id, instance) {
        if (instance) {
          customThemeItemRefs[id] = instance;
        } else {
          delete customThemeItemRefs[id];
        }
      }

      const canAddCustomTheme = computed(
        () => Object.keys(customThemes.value).length < MAX_CUSTOM_THEMES,
      );

      const getClassByWindowSize = computed(() => {
        if (windowIsLarge.value) return 'large';
        if (windowIsMedium.value) return 'medium';
        if (windowIsSmall.value) return 'small';
        return null;
      });

      function startEditCustomTheme(theme) {
        editingTheme.value = theme;
      }

      function generateNewThemeName() {
        // Pick the lowest index that isn't already taken, so a name freed up by
        // a deletion doesn't collide with a still-present theme.
        const existingNames = Object.values(customThemes.value).map(theme => theme.name);
        let index = 1;
        while (existingNames.includes(defaultThemeName$({ index }))) {
          index += 1;
        }
        return defaultThemeName$({ index });
      }

      function generateThemeName(themeKey) {
        return themeStrings[themeKey] ? themeStrings[themeKey].name$() : '';
      }

      function generateThemeAriaLabel(themeKey) {
        return themeStrings[themeKey] ? themeStrings[themeKey].ariaLabel$() : '';
      }

      // After each add/edit/delete the modal closes, so focus is restored to a
      // sensible button. KButton gained a public focus() method in KDS 5.8.0; until
      // we upgrade from 5.7.0 we focus its root element directly via $el (which is
      // exactly what that method does internally).
      function createTheme(tempTheme) {
        const created = createCustomTheme(tempTheme);
        emit('setTheme', created);
        newThemeName.value = null;
        nextTick(() => {
          customThemeItemRefs[created.id].$refs.colorButton.$el.focus();
        });
      }

      function updateTheme(tempTheme) {
        const updated = updateCustomTheme(editingTheme.value.id, tempTheme);
        emit('setTheme', updated);
        editingTheme.value = null;
        nextTick(() => {
          customThemeItemRefs[updated.id].$refs.editButton.$el.focus();
        });
      }

      function deleteTheme(theme) {
        removeCustomTheme(theme.id);
        themeToDelete.value = null;
        if (theme.id === props.theme.id) {
          emit('setTheme', THEMES.WHITE); // apply the default theme
        }
        nextTick(() => {
          addCustomThemeButton.value.$el.focus();
        });
      }

      function cancelAdd() {
        newThemeName.value = null;
        nextTick(() => {
          addCustomThemeButton.value.$el.focus();
        });
      }

      function cancelEdit() {
        const { id } = editingTheme.value;
        editingTheme.value = null;
        nextTick(() => {
          customThemeItemRefs[id].$refs.editButton.$el.focus();
        });
      }

      return {
        customThemes,
        themeToDelete,
        editingTheme,
        newThemeName,
        addCustomThemeButton,
        setCustomThemeItemRef,
        canAddCustomTheme,
        getClassByWindowSize,
        startEditCustomTheme,
        generateNewThemeName,
        generateThemeName,
        generateThemeAriaLabel,
        createTheme,
        updateTheme,
        deleteTheme,
        cancelAdd,
        cancelEdit,
        sideBarTitle$,
        closeSideBar$,
        textSize$,
        decrease$,
        increase$,
        theme$,
        customTheme$,
        addNewTheme$,
      };
    },
    props: {
      theme: {
        type: Object,
        required: true,
      },
      decreaseFontSizeDisabled: {
        type: Boolean,
        required: false,
        default: false,
      },
      increaseFontSizeDisabled: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    computed: {
      themes() {
        return THEMES;
      },
      settingsButtonFocus() {
        return {
          ':focus': {
            ...this.$coreOutline,
            outlineOffset: '0px',
            outlineWidth: '2px',
          },
        };
      },
    },
    methods: {
      isCurrentlySelectedTheme(theme) {
        return theme.id === this.theme.id;
      },
      generateStyle(theme) {
        return {
          ...this.settingsButtonFocus,
          backgroundColor: theme.backgroundColor,
          color: theme.textColor,
          ':hover': {
            backgroundColor: theme.hoverColor,
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  // Promote the theme modals' overlay onto its own compositing layer. On Safari a
  // composited iframe (the rendered EPUB) can paint over a position:fixed overlay
  // regardless of z-index; a null translateZ forces the overlay into its own layer
  // so it stacks above the book. Mirrors the Safari layering fix in AuthBase
  // (commit 04884db290).
  /deep/ .modal-overlay {
    transform: translateZ(1px);
  }

  hr {
    margin-top: 16px;
    margin-bottom: 16px;
  }

  .sidebar-titlebar {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .font-size-icon {
    top: 0;
    width: 24px;
    height: 24px;
  }

  .settings-button {
    width: calc(100% - 4px);
    min-width: unset;
    padding: 8px;
    margin: 2px;
    line-height: unset;
    transition: none;
  }

  .theme-button {
    height: 64px;
    margin-top: 16px;
    border-style: solid;
    border-width: 2px;
    border-radius: 8px;
  }

  .default-theme-selected {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  .default-theme-selected-icon {
    top: 0;
    width: 24px;
    height: 24px;
  }

  .o-f-h {
    overflow-x: hidden;
  }

  .truncate {
    @include truncate-text;
  }

  .epub-sidebar.large {
    width: 500px;
  }

  .epub-sidebar.medium {
    width: 400px;
  }

  .epub-sidebar.small {
    width: 100%;
  }

</style>
