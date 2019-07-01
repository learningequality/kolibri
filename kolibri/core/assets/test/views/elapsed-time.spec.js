import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import ElapsedTime from '../../src/views/ElapsedTime';

const localVue = createLocalVue();
localVue.use(Vuex);

const DUMMY_CURRENT_DATE = new Date(2017, 0, 1, 1, 1, 1);

function makeWrapper(options) {
  const store = new Vuex.Store();
  return mount(ElapsedTime, {
    ...options,
    store,
    localVue,
  });
}

// prettier-ignore
function getTimeText(wrapper) {
  return wrapper.find('span').text().trim();
}

describe('elapsed time component', () => {
  it('should show display a "—" if no date is passed in', () => {
    const wrapper = makeWrapper({ propsData: {} });
    const timeText = getTimeText(wrapper);
    expect(timeText).toEqual('—');
  });
  it('should ceiling the time at now if the time is bigger than now', () => {
    const date20SecondsInTheFuture = new Date(DUMMY_CURRENT_DATE);
    date20SecondsInTheFuture.setSeconds(date20SecondsInTheFuture.getSeconds() + 20);
    const wrapper = makeWrapper({
      propsData: {
        date: date20SecondsInTheFuture,
      },
    });
    wrapper.vm.now = DUMMY_CURRENT_DATE;
    const timeText = getTimeText(wrapper);
    expect(/now/.test(timeText)).toEqual(true);
  });

  it('should use seconds if the date passed in 1 second ago', () => {
    const date1SecondAgo = new Date(DUMMY_CURRENT_DATE);
    date1SecondAgo.setSeconds(date1SecondAgo.getSeconds() - 1);
    const wrapper = makeWrapper({
      propsData: {
        date: date1SecondAgo,
      },
    });
    wrapper.vm.now = DUMMY_CURRENT_DATE;
    const timeText = getTimeText(wrapper);
    expect(/second/.test(timeText)).toEqual(true);
  });

  it('should use minutes if the date passed in is 60 seconds ago', () => {
    const date60SecondsAgo = new Date(DUMMY_CURRENT_DATE);
    date60SecondsAgo.setSeconds(date60SecondsAgo.getSeconds() - 60);
    const wrapper = makeWrapper({
      propsData: {
        date: date60SecondsAgo,
      },
    });
    wrapper.vm.now = DUMMY_CURRENT_DATE;
    const timeText = getTimeText(wrapper);
    expect(/minute/.test(timeText)).toEqual(true);
  });

  it('should use minutes if the date passed in is 1 minute ago', () => {
    const date1MinuteAgo = new Date(DUMMY_CURRENT_DATE);
    date1MinuteAgo.setMinutes(date1MinuteAgo.getMinutes() - 1);
    const wrapper = makeWrapper({
      propsData: {
        date: date1MinuteAgo,
      },
    });
    wrapper.vm.now = DUMMY_CURRENT_DATE;
    const timeText = getTimeText(wrapper);
    expect(/minute/.test(timeText)).toEqual(true);
  });

  it('should use hours if the date passed is 60 minutes ago', () => {
    const date60MinutesAgo = new Date(DUMMY_CURRENT_DATE);
    date60MinutesAgo.setMinutes(date60MinutesAgo.getMinutes() - 60);
    const wrapper = makeWrapper({
      propsData: {
        date: date60MinutesAgo,
      },
    });
    wrapper.vm.now = DUMMY_CURRENT_DATE;
    const timeText = getTimeText(wrapper);
    expect(/hour/.test(timeText)).toEqual(true);
  });

  it('should use hours if the date passed is 1 hour ago', () => {
    const date1HourAgo = new Date(DUMMY_CURRENT_DATE);
    date1HourAgo.setHours(date1HourAgo.getHours() - 1);
    const wrapper = makeWrapper({
      propsData: {
        date: date1HourAgo,
      },
    });
    wrapper.vm.now = DUMMY_CURRENT_DATE;
    const timeText = getTimeText(wrapper);
    expect(/hour/.test(timeText)).toEqual(true);
  });

  it('should use days if the date passed is 24 hours ago', () => {
    const date24HoursAgo = new Date(DUMMY_CURRENT_DATE);
    date24HoursAgo.setHours(date24HoursAgo.getHours() - 24);
    const wrapper = makeWrapper({
      propsData: {
        date: date24HoursAgo,
      },
    });
    wrapper.vm.now = DUMMY_CURRENT_DATE;
    const timeText = getTimeText(wrapper);
    expect(/day/.test(timeText)).toEqual(true);
  });

  it('should use days if the date passed is 1 day ago', () => {
    const date1DayAgo = new Date(DUMMY_CURRENT_DATE);
    date1DayAgo.setDate(date1DayAgo.getDate() - 1);
    const wrapper = makeWrapper({
      propsData: {
        date: date1DayAgo,
      },
    });
    wrapper.vm.now = DUMMY_CURRENT_DATE;
    const timeText = getTimeText(wrapper);
    expect(/day/.test(timeText)).toEqual(true);
  });

  it('should use months if the date passed is 4 weeks ago', () => {
    const date4WeeksAgo = new Date(DUMMY_CURRENT_DATE);
    date4WeeksAgo.setMonth(date4WeeksAgo.getMonth() - 1);
    const wrapper = makeWrapper({
      propsData: {
        date: date4WeeksAgo,
      },
    });
    wrapper.vm.now = DUMMY_CURRENT_DATE;
    const timeText = getTimeText(wrapper);
    expect(/month/.test(timeText)).toEqual(true);
  });

  it('should use months if the date passed is 1 month ago', () => {
    const date1MonthAgo = new Date(DUMMY_CURRENT_DATE);
    date1MonthAgo.setMonth(date1MonthAgo.getMonth() - 1);
    const wrapper = makeWrapper({
      propsData: {
        date: date1MonthAgo,
      },
    });
    wrapper.vm.now = DUMMY_CURRENT_DATE;
    const timeText = getTimeText(wrapper);
    expect(/month/.test(timeText)).toEqual(true);
  });

  it('should use years if the date passed is 12 months ago', () => {
    const date12MonthsAgo = new Date(DUMMY_CURRENT_DATE);
    date12MonthsAgo.setMonth(date12MonthsAgo.getMonth() - 12);
    const wrapper = makeWrapper({
      propsData: {
        date: date12MonthsAgo,
      },
    });
    wrapper.vm.now = DUMMY_CURRENT_DATE;
    const timeText = getTimeText(wrapper);
    expect(/year/.test(timeText)).toEqual(true);
  });

  it('should use years if the date passed is 1 year ago', () => {
    const date1YearAgo = new Date(DUMMY_CURRENT_DATE);
    date1YearAgo.setYear(date1YearAgo.getYear() - 1);
    const wrapper = makeWrapper({
      propsData: {
        date: date1YearAgo,
      },
    });
    wrapper.vm.now = DUMMY_CURRENT_DATE;
    const timeText = getTimeText(wrapper);
    expect(/year/.test(timeText)).toEqual(true);
  });
});
