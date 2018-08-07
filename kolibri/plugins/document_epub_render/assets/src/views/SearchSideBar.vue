<template>

    <SideBar
      class="search-side-bar"
    >
      <form
        slot="sideBarHeader"
        @submit.prevent="handleSearchInput"
      >
        <input
          ref="searchInput"
          autofocus="true"
          v-model.trim="searchQuery"
        >
        <UiIconButton
          type="secondary"
          buttonType="submit"
          class="search-submit-button"
        >
          <mat-svg
            name="search"
            category="action"
          />
        </UiIconButton>
      </form>

      <div slot="sideBarMain">
        <transition
          name="search-results"
          mode="out-in"
        >
          <KCircularLoader
            v-if="searchIsLoading"
            :delay="false"
          />
          <div v-else>
            <transition
              name="search-results"
              mode="out-in"
            >
              <p v-if="noSearchResults">{{ $tr('noSearchResults') }}</p>
              <div v-else-if="searchResults.length > 0">
                <p>{{ $tr('numberOfSearchResults', { count: searchResults.length}) }}</p>
                <ol class="search-results-list">
                  <li
                    v-for="(item, index) in searchResultsToDisplay"
                    :key="index"
                    class="toc-list-item"
                  >
                    <KButton
                      appearance="basic-link"
                      @click="handleSearchResultNavigation(item)"
                    >
                      <template v-html="item.html"></template>
                    </KButton>
                  </li>
                </ol>
              </div>
            </transition>
          </div>
        </transition>
      </div>
    </SideBar>

</template>

<script>

  export default {
    name: 'Settings',
  };

</script>


<style lang="scss" scoped>


</style>
