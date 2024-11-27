<template>

  <div v-if="loading">
    <KCircularLoader />
  </div>
  <div 
    v-else
    class="resource-list-style"
  >
    <p>{{ coreString('lessonsLabel') }} : {{ currentLesson.title }} </p>
    <p>{{ $tr('sizeLabel') }} : {{ bytesForHumans(currentLesson.size) }}</p>

    <div
      v-for="(lesson , index) in resources"
      :key="index"
    >
      <KGrid :style="lessonOrderListButtonBorder">
        <KGridItem :layout12="{ span: 6 }">
          <div style="display:flex;">
            <div>
              <DragSortWidget
                :moveUpText="upLabel$"
                :moveDownText="downLabel$"
                :noDrag="true"
                :isFirst="index === 0"
                :isLast="index === resources.length - 1"
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

</template>


<script>

  import DragSortWidget from 'kolibri-common/components/sortable/DragSortWidget';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  
  export default {
    name:"SelectedResource",
    components:{
      DragSortWidget,
      LearningActivityIcon
    },
    mixins:[commonCoreStrings],
    setup(){
     const { upLabel$, downLabel$ } = searchAndFilterStrings;
        return {
        upLabel$,
        downLabel$
        };
    },
    props:{
      resourceList:{
        type: Array,
        required:true
      },
      currentLesson:{
        type:Object,
        required:true
      },
      loading:{
        type:Boolean,
        required:true
      }
    },
    data() {
      return {
        resources: []
      }
    },
    computed:{
      lessonOrderListButtonBorder(){
        return {
          borderBottom: `1px solid ${this.$themePalette.grey.v_200}`, 
          height:`4em`,
          marginTop:`0.5em`
        };
      },
    },
    mounted(){
      setTimeout(() => {
        this.resources = this.resourceList;
      }, 1000);
    },

    methods:{
      removeResource(id){
        this.resources = this.resources.filter(lesson => lesson.id !== id);
      },
      bytesForHumans
    },
    $trs:{
      sizeLabel:{
        message: 'Size',
        context: 'Size of the lesson'
      },
    }
  }

</script>


<style scoped >

 .add-minus-button{
    float:right;
  }

  .arrange-item-block{
    display:block;
  }

  .icon-style{
    font-size:24px;
  }

  .resource-list-style{
    margin-bottom: 3.5em;
  }
  
</style>