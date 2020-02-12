import { mount, RouterLinkStub } from '@vue/test-utils';
import NotificationCard from '../NotificationCard';

function makeWrapper(options) {
  const wrapper = mount(NotificationCard, {
    stubs: {
      CoachStatusIcon: {
        name: 'CoachStatusIcon',
        props: ['icon'],
        template: '<div></div>',
      },
      RouterLink: RouterLinkStub,
    },
    methods: {
      getRoute(x) {
        return x;
      },
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
    expect(wrapper.text()).toContain('JB finished a lesson');
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

  const statusIconTestCases = [
    ['Started', 'clock'],
    ['HelpNeeded', 'help'],
    ['Completed', 'star'],
  ];

  it.each(statusIconTestCases)(
    'shows the correct status icon for %s events',
    (eventType, iconType) => {
      const { wrapper } = makeWrapper({
        propsData: { eventType },
      });
      const icon = wrapper.find({ name: 'CoachStatusIcon' });
      expect(icon.props().icon).toEqual(iconType);
    }
  );

  const contentIconTestCases = [
    ['Lesson', 'lesson'],
    ['Quiz', 'exam'],
    ['Resource', 'video'],
  ];

  it.each(contentIconTestCases)(
    'shows the correct content icon if the assignment is a %s',
    (objectType, iconKind) => {
      const { wrapper } = makeWrapper({
        propsData: {
          objectType,
          resourceType: 'video',
        },
      });
      const contentIcon = wrapper.find({ name: 'ContentIcon' });
      expect(contentIcon.props().kind).toEqual(iconKind);
    }
  );

  const headerTestCases = [
    // learnerContext | contentContext | expected header
    [null, null, ''],
    ['Group 1', null, 'Group 1'],
    ['Group 1', 'Lesson 1', 'Group 1 • Lesson 1'],
    ['', 'Lesson 1', 'Lesson 1'],
  ];

  it.each(headerTestCases)(
    'formats the header message correctly when learnerContext: %s and contentContext: %',
    (learnerContext, contentContext, expected) => {
      const { wrapper } = makeWrapper({ propsData: { learnerContext, contentContext } });
      const header = wrapper.find('.context');
      expect(header.text()).toEqual(expected);
    }
  );
});
