<template>
  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    closeButtonIconType="close"
    @closePanel="closeSidePanel"
    @shouldFocusFirstEl="() => null"
  >
    <template #header>
      <h4 class="side-panel-title"> {{ $tr('numberOfSelectedResource',{ count : resourcesTable.length })}}</h4>
      <router-view @closePanel="() => $router.go(-1)" />
    </template>

    <div v-if="resourcesTable.length === 0">
      <KCircularLoader />
    </div>

    <div v-else>
      <p>{{ coreString('lessonsLabel') }} : {{ currentLesson.title }} </p>
      <p>{{ $tr('sizeLabel') }} : {{ bytesForHumans(currentLesson.size) }}</p>

      <div
        v-for="(lesson , index) in resourcesTable"
        :key="index"
      >
        <KGrid :style="lessonOrderListButtonBorder">
          <KGridItem :layout12="{ span: 6 }">
            <div style="display:flex;">
              <div>
                <DragSortWidget
                  moveUpText="up"
                  moveDownText="down"
                  :noDrag="true"
                  :isFirst="index === 0"
                  :isLast="index === resourcesTable.length - 1"
                  @moveUp="() => {}"
                  @moveDown="() => {}"
                />
              </div>
              <div style="padding:0px 10px">
                <span
                  style="flex: 1"
                >
                  <LearningActivityIcon
                    :kind="lesson.learning_activities[0]"
                    class="icon-style"
                  />
                </span>
              </div>
              <div>
                <span
                  class="arrange-item-block"
                >
                  <span>
                    <KRouterLink
                      v-if="lesson.link"
                      :text="lesson.title"
                      :to="lesson.link"
                      style="font-size:14px"
                    />
                  </span>
                  <p style="font-size:12px"> 4MB </p>
                </span>
              </div>
            </div>
          </KGridItem>

          <KGridItem :layout12="{ span: 6 }">
            <span
              class="add-minus-button"
            >
              <KIconButton
                icon="emptyTopic"
                @click="()=>{ }"
              />

              <KIconButton
                icon="minus"
                @click="removeResource(lesson.id)"
              />
            </span>
          </KGridItem>

        </KGrid>
      </div>
    </div>


    <template #bottomNavigation>
      <div class="bottom-buttons-style">
        <KButton
          :primary="true"
          text="save & finish"
          @click="closeSidePanel()"
        />
      </div>
    </template>
  </SidePanelModal>

</template>


<script>

  import DragSortWidget from 'kolibri-common/components/sortable/DragSortWidget';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { mapState } from 'vuex';

  export default {
    name:'ManageSelectedLessonResources',
    components: {
      DragSortWidget,
      LearningActivityIcon,
      SidePanelModal
    },
    mixins:[commonCoreStrings],
    data(){
      return {
        resources: [],
        isLoading:false,
      }
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
      resourcesTable(){
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
        })
      },
    },
    methods:{
      removeResource(id){
        this.resources = this.resources.filter((lesson) => lesson.id !== id);
      },
      closeSidePanel() {
        this.$router.go(-2);
      },
      bytesForHumans,
    },
    $trs:{
      sizeLabel:{
        message: 'Size',
        context: 'Size of the lesson'
      },
      numberOfSelectedResource: {
        message: '{count, number, integer} {count, plural, one {resource selected} other {resources selected}}',
        context:'Indicates the number of resources selected'
      }
    }
  }

</script>


<style scoped>

  .add-minus-button{
    float:right;
  }
  .arrange-item-block{
    display:block;
  }
  .icon-style{
    font-size:24px;
  }
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