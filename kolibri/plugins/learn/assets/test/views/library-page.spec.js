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
});
