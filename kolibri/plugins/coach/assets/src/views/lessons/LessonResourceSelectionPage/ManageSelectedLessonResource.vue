<template>

  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    @closePanel="() => $router.go(-1)"
    @shouldFocusFirstEl="() => null"
  >
  
  
    <div>
        
      
      <p>Lesson : Intro to chemical bond </p>

      <p>Size : 16 MB</p>


      <DragContainer
        v-if="sectionOrderList.length > 0"
        :items="sectionOrderList"
        @sort=""
      >
        <transition-group>
          <Draggable
            v-for="(index) in sectionOrderList"
            :key="index"
          >
            <DragHandle>
              <KGrid :style="lessonOrderListButtonBorder">
                <KGridItem :layout12="{ span: 8 }">
                  <div style="display:flex;">
                    <div>
                      <DragSortWidget
                        class="drag-title"
                        moveUpText="up"
                        moveDownText="down"
                        :noDrag="true"
                        :isFirst="index === 0"
                        :isLast="index === sectionOrderList.length - 1"
                        @moveUp="() => {}"
                        @moveDown="() => {}"
                      />
                    </div>
                    <div style="padding:0px 10px">
                      <span
                        class="drag-title"
                        style="flex: 1"
                      >
                        <KIcon
                          class="icon-style"
                          icon="practiceSolid"
                        />
                      </span>
                    </div>
                    <div>
                      <span
                        class="arrange-item-block"
                      >
                        <span>
                          <KRouterLink  
                            text="Metallic bond"
                            :to="{}" 
                            style="font-size:14px"
                          />
                        </span>
                        <p style="font-size:12px"> 0.4MB </p>
                      </span>
                    </div>
                  </div>
                </KGridItem>


                <KGridItem :layout12="{ span: 4 }">
                  <span
                    class="add-minus-button"
                  >
                    <KIcon 
                      class="icon-style"
                      style="font-weight:600" 
                      icon="emptyTopic" 
                    />
                    <KIcon 
                      class="icon-style"
                      style="font-weight:600" 
                      icon="minus" 
                    />
                  </span>
                </KGridItem>

              </KGrid>
            </DragHandle>
          </Draggable>
        </transition-group>
      </DragContainer>

      <div class="bottom-buttons-style">
        <KButton
          :primary="true"
          text="save & finish"
          @click="() => {}"
        />
      </div>
    </div>
  </SidePanelModal>

</template>


<script>

  import Draggable from 'kolibri.coreVue.components.Draggable';
  import DragContainer from 'kolibri.coreVue.components.DragContainer';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import DragSortWidget from 'kolibri.coreVue.components.DragSortWidget';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';

  export default {
    name:'ManageSelectedLessonResources',
    components: {
      Draggable,
      DragContainer,
      DragHandle,
      DragSortWidget,
      SidePanelModal,
    },
    data(){
      return {
        sectionOrderList:[ 1,2,3,4,5]
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