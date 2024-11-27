<template>
  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    closeButtonIconType="close"
    @closePanel="closeSidePanel"
    @shouldFocusFirstEl="() => null"
  >
    <template #header>
      <KIconButton
        v-if="true"
        icon="back"
        @click="$router.go(-1)"
      />
      <span :style="{ fontWeight: '600' }" class="side-panel-title">
         {{ $tr('numberOfSelectedResource',
         { count : fetchResources.length })}}
         </span>
    </template>

    <SelectedResource
      :resourceList="fetchResources"
      :currentLesson="currentLesson"
      :loading="fetchResources.length === 0"
    />


    <template #bottomNavigation>
      <div class="bottom-buttons-style">
        <KButton
          :primary="true"
          :text="saveLessonResources$()"
          @click="closeSidePanel()"
        />
      </div>
    </template>
  </SidePanelModal>

</template>


<script>

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { mapState } from 'vuex';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import SelectedResource from './SelectedResource';

  export default {
    name:'ManageSelectedLessonResources',
    components: {
      SidePanelModal,
      SelectedResource
    },
    setup() {
      const { saveLessonResources$ } =
        searchAndFilterStrings;
      return {
        saveLessonResources$ 
      };
    },
    computed: {
      ...mapState('lessonSummary', ['currentLesson', 'workingResources','resourceCache']),
      lessonOrderListButtonBorder(){
        return {
          borderBottom: `1px solid ${this.$themePalette.grey.v_200}`,
          height:`4em`,
          marginTop:`0.5em`
        };
      },
      fetchResources(){
        return this.workingResources.map(resource => {
          const content = this.resourceCache[resource.contentnode_id];
          if (!content) {
            return this.missingResourceObj(resource.contentnode_id);
          }
          const tableRow = {
            ...content,
            node_id: content.id,
          };

          const link = {};
          if (link) {
            tableRow.link = link;
          }

          return tableRow;
        });
      },
    },
    methods:{
      closeSidePanel() {
        this.$router.go(-2);
      },
    },
    $trs:{
      numberOfSelectedResource: {
        message: '{count, number, integer} {count, plural, one {resource selected} other {resources selected}}',
        context:'Indicates the number of resources selected'
      }
    }
  }

</script>


<style scoped>

  .bottom-buttons-style {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    padding: 1em;
    margin-top: 1em;
    text-align: right;
    background-color: #ffffff;
    border-top: 1px solid black;
  }

</style>