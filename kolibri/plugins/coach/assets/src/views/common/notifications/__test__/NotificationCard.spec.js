import { mount, RouterLinkStub } from '@vue/test-utils';
import NotificationCard from '../NotificationCard';

NotificationCard.methods.getRoute = x => x;

function makeWrapper(options) {
  const wrapper = mount(NotificationCard, {
    stubs: {
      CoachStatusIcon: {
        props: ['icon'],
        template: '<div></div>',
      },
      RouterLink: RouterLinkStub,
    },
    propsData: {
      eventType: 'Completed',
      objectType: 'Lesson',
      targetPage: {},
      linkText: 'JB finished a lesson',
      ...options.propsData,
    },
  });
  return { wrapper };
}

describe('NotificationCard component', () => {
  it('shows a link if a full targetPage prop is provided', () => {
    const { wrapper } = makeWrapper({
      propsData: {
        targetPage: {
          name: 'CoolReport',
          params: {},
        },
      },
    });
    const link = wrapper.find({ name: 'KRouterLink' });
    expect(link.props().to.name).toEqual('CoolReport');
    expect(link.props('text')).toEqual('JB finished a lesson');
  });

  it('shows text only if an empty targetPage prop is provided', () => {
    const { wrapper } = makeWrapper({
      propsData: {
        targetPage: {},
      },
    });

    const link = wrapper.find({ name: 'KRouterLink' });
    expect(link.exists()).toEqual(false);
    expect(wrapper.text()).toEqual('JB finished a lesson');
  });

  it('has a single KFixedGridItem if no time is provided', () => {
    const { wrapper } = makeWrapper({
      propsData: {},
    });
    const gridItems = wrapper.findAll({ name: 'KFixedGridItem' });
    expect(gridItems.length).toEqual(1);
    expect(gridItems.at(0).props().span).toEqual(4);
  });

  it('has a second KFixedGridItem with the time if it is provided', () => {
    const timeString = '2019-01-17 01:29:04.016364';
    const { wrapper } = makeWrapper({
      propsData: {
        time: timeString,
      },
    });
    const gridItems = wrapper.findAll({ name: 'KFixedGridItem' });
    expect(gridItems.length).toEqual(2);
    expect(gridItems.at(0).props().span).toEqual(3);
    expect(gridItems.at(1).props().span).toEqual(1);

    const elapsedTime = wrapper.find({ name: 'ElapsedTime' });
    const timeObject = new Date(timeString).getTime();
    expect(elapsedTime.props().date.getTime()).toEqual(timeObject);
  });

  it('shows the correct status icon for Started, HelpNeeded, and Completed events', () => {
    const { wrapper } = makeWrapper({
      propsData: {
        eventType: 'Started',
      },
    });

    const icon = wrapper.find({ name: 'CoachStatusIcon' });
    expect(icon.props().icon).toEqual('clock');

    wrapper.setProps({ eventType: 'HelpNeeded' });
    expect(icon.props().icon).toEqual('help');

    wrapper.setProps({ eventType: 'Completed' });
    expect(icon.props().icon).toEqual('star');
  });

  it('shows the correct content icon if the assignment is a quiz, lesson, or resource', () => {
    const { wrapper } = makeWrapper({
      propsData: {
        objectType: 'Lesson',
        resourceType: 'video',
      },
    });
    const contentIcon = wrapper.find({ name: 'ContentIcon' });
    expect(contentIcon.props().kind).toEqual('lesson');

    wrapper.setProps({ objectType: 'Quiz' });
    expect(contentIcon.props().kind).toEqual('exam');

    wrapper.setProps({ objectType: 'Resource' });
    expect(contentIcon.props().kind).toEqual('video');
  });

  it('formats the header message when the learner context, content context, none, or both are provided', () => {
    const { wrapper } = makeWrapper({});
    const header = wrapper.find('.context');

    expect(header.text()).toEqual('');

    wrapper.setProps({ learnerContext: 'Group 1' });
    expect(header.text()).toEqual('Group 1');

    wrapper.setProps({
      learnerContext: 'Group 1',
      contentContext: 'Lesson 1',
    });
    expect(header.text()).toEqual('Group 1 • Lesson 1');

    wrapper.setProps({
      learnerContext: '',
      contentContext: 'Lesson 1',
    });
    expect(header.text()).toEqual('Lesson 1');
  });
});
