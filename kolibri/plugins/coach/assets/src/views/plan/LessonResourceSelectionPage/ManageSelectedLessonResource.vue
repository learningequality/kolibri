<template>

  <div>
    <p>{{ coreString('lessonsLabel') }} : {{ lessonObject.title }} </p>

    <p>{{ $tr('sizeLabel') }} : {{ bytesForHumans(lessonObject.size) }}</p>

    <div
      v-for="(lesson , index) in resources"
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

    <div class="bottom-buttons-style">
      <KButton
        :primary="true"
        text="save & finish"
        @click="()=>{ }"
      />
    </div>
  </div>

</template>


<script>

  import DragSortWidget from 'kolibri.coreVue.components.DragSortWidget';
  import  commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';

  export default {
    name:'ManageSelectedLessonResources',
    components: {
      DragSortWidget,
      LearningActivityIcon
    },
    mixins:[commonCoreStrings],
    props:{
      lessonResourceList:{
        type: Array,
        required:true
      },
      lessonObject:{
        type: Object,
        required:true
      },
    },
    data(){
      return {
        resources: this.lessonResourceList,
      }
    },
    computed: {
      lessonOrderListButtonBorder(){
        return {
          borderBottom: `1px solid ${this.$themePalette.grey.v_200}`, 
          height:`4em`,
          marginTop:`0.5em`
        };
      },
    },
    methods:{
      removeResource(id){
        this.resources = this.resources.filter((lesson) => lesson.id !== id);
      },
      bytesForHumans,
    },

    $trs:{
      sizeLabel:{
        message: 'Size',
        context: 'Size of the lesson'
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