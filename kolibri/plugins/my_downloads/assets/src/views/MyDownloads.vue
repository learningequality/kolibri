<template>

  <AppBarPage :title="coreString('myDownloadsLabel')">
    <KPageContainer class="container">
      <h1> {{ coreString('myDownloadsLabel') }} </h1>
      <KGrid>
        <KGridItem
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <table>
            <tr>
              <th>Total size of my downloads</th>
              <td>XX MB</td>
            </tr>
            <tr>
              <th>Total size of my library</th>
              <td>YY MB</td>
            </tr>
            <tr>
              <th>Free disk space</th>
              <td>XXX MB</td>
            </tr>
          </table>
        </KGridItem>
        <KGridItem
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <KSelect
            class="selector"
            :style="selectorStyle"
            :inline="windowIsLarge"
            label="Activity type"
            :options="activityTypes"
            :value="activityTypeSelected"
            @change="handleActivityTypeChange($event.value)"
          >
            <template #display>
              <KLabeledIcon
                :label="activityTypeSelected.label"
                :icon="activityTypeSelected.icon"
              />
            </template>
            <template #option="{ option }">
              <KLabeledIcon
                :label="option.label"
                :icon="option.icon"
                :style="{ padding: '8px' }"
              />
            </template>
          </KSelect>
          <KSelect
            class="selector"
            :style="selectorStyle"
            :inline="windowIsLarge"
            label="Sort by"
            :options="sortOptions"
            :value="sortOptionSelected"
            @change="handleSortChange($event.value)"
          />
        </KGridItem>
      </KGrid>
    </KPageContainer>
  </AppBarPage>

</template>


<script>

  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'MyDownloads',
    components: {
      AppBarPage,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    data() {
      return {
        activityTypeSelected: {
          label: 'All',
          value: 'all',
          icon: 'allActivities',
        },
        activityTypes: [
          {
            label: 'All',
            value: 'all',
            icon: 'allActivities',
          },
          {
            label: 'Watch',
            value: 'watch',
            icon: 'watchSolid',
          },
          {
            label: 'Read',
            value: 'read',
            icon: 'readSolid',
          },
          {
            label: 'Practice',
            value: 'practice',
            icon: 'practiceSolid',
          },
          {
            label: 'Reflect',
            value: 'reflect',
            icon: 'reflectSolid',
          },
          {
            label: 'Listen',
            value: 'listen',
            icon: 'listenSolid',
          },
          {
            label: 'create',
            value: 'create',
            icon: 'createSolid',
          },
          {
            label: 'Explore',
            value: 'explore',
            icon: 'interactSolid',
          },
        ],
        sortOptionSelected: {
          label: 'Newest',
          value: 'newest',
        },
        sortOptions: [
          {
            label: 'Newest',
            value: 'newest',
          },
          {
            label: 'Oldest',
            value: 'oldest',
          },
          {
            label: 'Largest file size',
            value: 'largest',
          },
          {
            label: 'Smallest file size',
            value: 'smallest',
          },
        ],
      };
    },
    computed: {
      selectorStyle() {
        // return styles for child component with class ".selector"
        return {
          color: this.$themeTokens.text,
          backgroundColor: this.$themePalette.grey.v_200,
          borderRadius: '2px',
          marginTop: '16px',
          marginBottom: 0,
          width: this.windowIsLarge
            ? 'calc(50% - 16px)' // 16px is the margin of the select
            : '100%',
        };
      },
    },
    methods: {
      handleActivityTypeChange(value) {
        this.activityTypeSelected = this.activityTypes.find(
          activityType => activityType.value === value
        );
      },
      handleSortChange(value) {
        this.sortOptionSelected = this.sortOptions.find(sortOption => sortOption.value === value);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .container {
    min-height: 600px;
  }

  .selector {
    /deep/ .ui-select-label-text {
      padding: 10px 10px 0;
    }

    /deep/ .ui-select-display {
      padding: 0 10px;
    }
  }

  th {
    text-align: left;
  }

  td {
    text-align: right;
  }

  th,
  td {
    height: 2em;
    padding-right: 24px;
    font-size: 14px;
  }

</style>
