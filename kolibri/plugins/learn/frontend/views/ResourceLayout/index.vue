<script>

  import { h, ref } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import SidePanelModal from 'kolibri-common/components/courses/sidePanel/SidePanelModal';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import useRequestableSlot from './useRequestableSlot';

  // Side panel width used for both push mode (CSS) and modal mode (prop)
  const SIDE_PANEL_WIDTH = '350px';

  // Injection keys for provide/inject pattern
  const REQUEST_SIDE_PANEL_KEY = 'resourceLayoutRequestSidePanel';
  const REQUEST_BOTTOM_BAR_KEY = 'resourceLayoutRequestBottomBar';
  const REQUEST_SIDE_PANEL_FOOTER_KEY = 'resourceLayoutRequestSidePanelFooter';

  /**
   * ResourceLayout — full-screen layout for course content viewing.
   *
   * Nested ResourceLayouts can "claim" claimable slots from their ancestor,
   * with deepest winning by default and focus-based switching between subtrees.
   *
   * @slot default        - Main content area
   * @slot topBar         - Top navigation bar content (rendered inside KToolbar; non-claimable)
   * @slot sidePanel      - Side panel content (claimable by nested ResourceLayouts)
   * @slot bottomBar      - Bottom bar content (claimable by nested ResourceLayouts)
   * @slot sidePanelTopBar   - Side panel header/title area (non-claimable)
   * @slot sidePanelFooter   - Side panel footer (claimable by nested ResourceLayouts)
   */
  export default {
    name: 'ResourceLayout',
    components: {
      SidePanelModal,
    },
    setup(props, { slots }) {
      const { windowBreakpoint } = useKResponsiveWindow();
      const $themeTokens = themeTokens();

      // Create requestable (claimable) slots
      const sidePanel = useRequestableSlot(REQUEST_SIDE_PANEL_KEY, slots, 'sidePanel');
      const bottomBar = useRequestableSlot(REQUEST_BOTTOM_BAR_KEY, slots, 'bottomBar');
      const sidePanelFooter = useRequestableSlot(
        REQUEST_SIDE_PANEL_FOOTER_KEY,
        slots,
        'sidePanelFooter',
      );

      // All ResourceLayout instances provide all three injection keys,
      // so any one of them can be used to detect nesting.
      const isNested = Boolean(sidePanel.parentRequest);

      // Side panel open/closed state (only top-level manages this)
      const sidePanelOpen = ref(false);

      function toggleSidePanel() {
        sidePanelOpen.value = !sidePanelOpen.value;
      }

      function closeSidePanel() {
        sidePanelOpen.value = false;
      }

      // Theme-based styles (static for session)
      const bgColor = $themeTokens.surface;
      const border = `1px solid ${$themeTokens.fineLine}`;

      const { openSidePanelLabel$, closeSidePanelLabel$ } = coursesStrings;

      // Helper to create toggle/close button
      const toggleButton = (onClick, icon, ariaLabel) =>
        h('KIconButton', {
          attrs: { 'data-testid': 'side-panel-toggle' },
          props: {
            icon,
            ariaLabel,
            tooltip: ariaLabel,
            appearance: 'flat-button',
            size: 'small',
          },
          on: { click: onClick },
        });

      // Helper to render the full side panel aside region
      // Shared between push mode and modal mode
      const renderSidePanelAside = (closeIcon, isModal = false) => {
        const children = [];

        // Header: title slot + close/toggle button
        const headerChildren = [];
        if (slots.sidePanelTopBar) {
          headerChildren.push(h('div', { class: 'side-panel-title' }, slots.sidePanelTopBar()));
        }
        headerChildren.push(
          toggleButton(
            isModal ? closeSidePanel : toggleSidePanel,
            closeIcon,
            closeSidePanelLabel$(),
          ),
        );
        children.push(
          h(
            'div',
            {
              attrs: { 'data-testid': 'side-panel-header' },
              class: 'side-panel-header',
              style: { borderBottom: border },
            },
            headerChildren,
          ),
        );

        // Content
        children.push(
          h(
            'div',
            {
              attrs: { 'data-testid': 'side-panel-content' },
              class: 'side-panel-content',
            },
            sidePanel.getContent(),
          ),
        );

        // Footer (if present)
        if (sidePanelFooter.hasContent()) {
          children.push(
            h(
              'div',
              {
                attrs: { 'data-testid': 'side-panel-footer' },
                class: 'side-panel-footer',
                style: { backgroundColor: bgColor, borderTop: border },
              },
              sidePanelFooter.getContent(),
            ),
          );
        }

        return h(
          'aside',
          {
            attrs: { 'data-testid': isModal ? 'side-panel-modal' : 'side-panel' },
            class: isModal ? 'side-panel-modal-content' : 'side-panel',
            style: isModal
              ? {}
              : {
                width: SIDE_PANEL_WIDTH,
                backgroundColor: bgColor,
                borderLeft: border,
              },
          },
          children,
        );
      };

      return () => {
        // Nested ResourceLayouts: register slots with parent and render only default content
        if (isNested) {
          sidePanel.syncRegistration(slots.sidePanel);
          bottomBar.syncRegistration(slots.bottomBar);
          sidePanelFooter.syncRegistration(slots.sidePanelFooter);
          return slots.default ? h('div', {}, slots.default()) : null;
        }

        // === TOP-LEVEL RENDERING ===
        const hasSidePanelContent = sidePanel.hasContent();
        const showPushPanel =
          hasSidePanelContent && sidePanelOpen.value && windowBreakpoint.value > 2;
        const showModalPanel =
          hasSidePanelContent && sidePanelOpen.value && windowBreakpoint.value <= 2;
        const hasTopBar = slots.topBar || hasSidePanelContent;

        // === TOP BAR with KToolbar ===
        let topBar = null;
        if (hasTopBar) {
          const toolbarActions = [];
          if (hasSidePanelContent && !sidePanelOpen.value) {
            toolbarActions.push(toggleButton(toggleSidePanel, 'menu', openSidePanelLabel$()));
          }

          topBar = h('div', { attrs: { 'data-testid': 'top-bar' }, class: 'top-bar' }, [
            h(
              'KToolbar',
              {
                props: { removeNavIcon: true, raised: false },
                scopedSlots: {
                  actions: () => toolbarActions,
                },
              },
              slots.topBar ? slots.topBar() : [],
            ),
          ]);
        }

        // === MAIN COLUMN: content + bottom bar ===
        const mainColumnChildren = [
          h(
            'div',
            { attrs: { 'data-testid': 'main-content-area' }, class: 'main-content-area' },
            slots.default ? slots.default() : [],
          ),
        ];

        if (bottomBar.hasContent()) {
          mainColumnChildren.push(
            h(
              'div',
              { attrs: { 'data-testid': 'bottom-bar-area' }, class: 'bottom-bar-area' },
              bottomBar.getContent(),
            ),
          );
        }

        const mainColumn = h('div', { class: 'main-column' }, mainColumnChildren);

        // === ASSEMBLE LAYOUT ===
        let mainLayout;

        if (showPushPanel) {
          // Push mode: wrap topBar + mainColumn in main-area so the
          // aside spans the full height of the layout alongside it.
          const mainArea = h('div', { class: 'main-area' }, [topBar, mainColumn].filter(Boolean));
          const body = h('div', { attrs: { 'data-testid': 'body' }, class: 'body' }, [
            mainArea,
            renderSidePanelAside('menu'),
          ]);
          mainLayout = h('div', { class: 'resource-layout' }, [body]);
        } else {
          const body = h('div', { attrs: { 'data-testid': 'body' }, class: 'body' }, [mainColumn]);
          mainLayout = h('div', { class: 'resource-layout' }, [topBar, body].filter(Boolean));
        }

        // === MODAL MODE ===
        if (showModalPanel) {
          const sidePanelModal = h(
            SidePanelModal,
            {
              props: { alignment: 'right', width: SIDE_PANEL_WIDTH },
              on: { closePanel: closeSidePanel },
            },
            [renderSidePanelAside('close', true)],
          );

          return h('div', {}, [mainLayout, sidePanelModal]);
        }

        return mainLayout;
      };
    },
  };

</script>


<style lang="scss" scoped>

  .resource-layout {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column;
  }

  // === TOP BAR ===
  .top-bar {
    flex-shrink: 0;
  }

  // === MAIN AREA (push mode: contains top-bar + main-column) ===
  .main-area {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
  }

  // === BODY ===
  .body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .main-column {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
  }

  .main-content-area {
    flex: 1;
    overflow: auto;
  }

  .bottom-bar-area {
    flex-shrink: 0;
  }

  // === SIDE PANEL (push mode) ===
  .side-panel {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .side-panel-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
  }

  .side-panel-title {
    flex: 1;
    min-width: 0;
  }

  .side-panel-content {
    flex: 1;
    overflow: auto;
  }

  .side-panel-footer {
    flex-shrink: 0;
  }

  // === MODAL STYLES ===
  .side-panel-modal-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

</style>
