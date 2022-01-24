describe('LibraryPage', () => {
  describe('displaying the filters button', () => {
    it('is visible when the page is not large', () => {});
    it('is hidden when the page is large', () => {});
  });

  describe('method: toggleSidePanelVisibility', () => {
    it('toggles the visibility of the side panel', () => {});
  });

  describe('default view: when displayingSearchResults is falsy', () => {
    it('displays a ChannelCardGroupGrid', () => {});

    it('displays grid / list toggle buttons when on small screens', () => {});

    describe('when there are resumableContentNodes', () => {
      it('displays resumable content nodes string', () => {});

      it('displays HybridLearningCardGrid', () => {});

      it('displays button to show more resumableContentNodes when there are moreResumableContentNodes', () => {});
    });
  });

  describe('when search results are loaded (displayingSearchResults is true, isLoading false)', () => {
    it('displays $trs.overCertainNumberOfSearchResults with results.length', () => {});

    describe('when there are results', () => {
      describe('when window is not extra small', () => {
        it('displays buttons to toggle between list and grid views', () => {});

        describe('method: toggleCardView', () => {
          it('sets this.currentViewStyle to the first param', () => {});
        });
      });

      it('displays HybridLearningCardGrid of results', () => {});
      it('displays a button to view more when there are more to be displayed', () => {
        // Try to test that the useSearch#searchMore fn is called on @click?
      });
    });
  });

  describe('when page is loading', () => {
    it('shows a KCircularLoader', () => {});
  });

  describe('method: handleShowSearchModal', () => {
    it('sets this.currentCategory to the first param', () => {});
    it('sets this.showSearchModal to true', () => {});
    it('sets this.sidePanelIsOpen to false, if the window is not small');
  });

  describe('method: toggleInfoPanel', () => {
    it('sets this.sidePanelContent to the first param', () => {});
  });

  describe('method: closeCategoryModal', () => {
    it('sets this.currentCategory to null', () => {});
  });

  describe('method: handleCategory', () => {
    it('passes the first param to this.setCategory', () => {});
    it('sets this.currentCategory to null', () => {});
  });

  describe('on large screens, the search/filter panel should display embedded within the main page', () => {
    // is there a way to test the currentCategory event?
    it('displays EmbeddedSidePanel', () => {});
  });

  describe('on non-large screens, the search/filter panel is displayed in a FullScreenSidePanel', () => {
    describe();
    // need to follow up on whether or not we will be changing the category search display (
    // modal vs. side panel) on medium screens
  });

  describe('when there is sidePanelContent, show FullScreenSidePanel', () => {
    it('shows BrowseResourceMetadata', () => {});
  });
});
