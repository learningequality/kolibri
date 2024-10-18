<template>

  <form
    class="box"
    :style="{ borderColor: $themeTokens.annotation }"
    @submit.prevent="search"
    @keydown.esc.prevent="clearSearchTerm"
  >
    <div
      class="box-row"
      :style="{ borderColor: $themeTokens.fineLine }"
    >
      <label
        class="visuallyhidden"
        for="searchfield"
      >
        {{ coreString('searchLabel') }}
      </label>

      <input
        ref="searchinput"
        v-model.trim="searchTerm"
        type="search"
        class="input"
        :class="$computedClass(inputPlaceHolderStyle)"
        :style="{ color: $themeTokens.text }"
        dir="auto"
        :placeholder="coreString('searchLabel')"
      >

      <div class="buttons-wrapper">
        <KIconButton
          icon="clear"
          :color="$themePalette.black"
          size="small"
          class="clear-button"
          :class="searchTerm === '' ? '' : 'clear-button-visible'"
          :ariaLabel="coreString('clearAction')"
          @click="clearSearchTerm"
        />
        <div
          class="submit-button-wrapper"
          :style="{ backgroundColor: $themeTokens.primary }"
        >
          <KIconButton
            icon="search"
            :color="$themeTokens.textInverted"
            class="submit-button"
            :disabled="!searchTermHasChanged"
            :ariaLabel="coreString('startSearchButtonLabel')"
            :style="{ fill: $themeTokens.textInverted }"
            @click="search"
          />
        </div>
      </div>
    </div>
  </form>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'LessonsSearchBox',
    mixins: [commonCoreStrings],
    data() {
      const { params, query } = this.$route;
      return {
        searchTerm: params.searchTerm || query.search || '',
      };
    },
    computed: {
      searchTermHasChanged() {
        const { params, query } = this.$route;
        const newSearchTerm = params.searchTerm || query.search;
        return this.searchTerm !== newSearchTerm;
      },
      inputPlaceHolderStyle() {
        return {
          '::placeholder': {
            color: this.$themeTokens.annotation,
          },
        };
      },
    },
    methods: {
      clearSearchTerm() {
        this.searchTerm = '';
        this.$refs.searchinput.focus();
        this.$emit('clear');
      },
      search() {
        if (this.searchTerm !== '' && this.searchTermHasChanged) {
          this.$emit('searchterm', this.searchTerm);
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  // TODO - consolidate with kFilterTextbox
  .box {
    margin-right: 8px;
  }

  .box-within-action-bar {
    width: 235px;
  }

  .box-row {
    display: table;
    width: 100%;
    border-style: solid;
    border-width: 2px;
    border-radius: $radius;
  }

  .input {
    position: relative;
    left: 8px;
    display: table-cell;
    width: 100%;
    height: 36px;
    padding: 0;
    margin: 0;
    vertical-align: middle;
    border: 0;

    // removes the IE clear button
    &::-ms-clear {
      display: none;
    }
    // removes the webkit browsers clear button
    &::-webkit-search-cancel-button {
      display: none;
    }
  }

  .buttons-wrapper {
    display: table-cell;
    height: 36px;
    text-align: right;
    vertical-align: middle;
  }

  .clear-button {
    width: 24px;
    height: 24px;
    margin-right: 3px;
    margin-left: 3px;
    vertical-align: middle;
    visibility: hidden;
  }

  .clear-button-visible {
    visibility: visible;
  }

  .submit-button {
    width: 36px;
    height: 36px;
  }

  .submit-button-wrapper {
    display: inline-block;
    vertical-align: middle;
    border-top-right-radius: 2px;
    border-bottom-right-radius: 2px;
  }

  .filter-icon {
    position: absolute;
    top: 50%;
    bottom: 50%;
    margin-left: 12px;
    transform: translate(-50%, -50%);
  }

  .filter:nth-of-type(1) {
    margin-right: 16px;
  }

  .filter {
    margin-bottom: 16px;
    margin-left: 28px;
  }

  .filters {
    margin-top: 24px;
  }

  .ib {
    position: relative;
    display: inline-block;
  }

</style>
