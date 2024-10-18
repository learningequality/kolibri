import { mount, createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import ElapsedTime from '../ElapsedTime';

const localVue = createLocalVue();
localVue.use(Vuex);

const DUMMY_CURRENT_DATE = new Date(2017, 0, 1, 1, 1, 1);

function makeWrapper(options) {
  const store = new Store();
  return mount(ElapsedTime, {
    ...options,
    store,
    localVue,
    data() {
      return {
        now: new Date(DUMMY_CURRENT_DATE),
      };
    },
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

  const pastTimeTestCases = [
    // amount | unit | expected message
    [-20, 'second', 'now'], // for times in the future
    [-3, 'hour', 'now'],
    [1, 'second', '1 second ago'],
    [2, 'second', '2 seconds ago'],
    [60, 'second', '1 minute ago'],
    [1, 'minute', '1 minute ago'],
    [2, 'minute', '2 minutes ago'],
    [60, 'minute', '1 hour ago'],
    [1, 'hour', '1 hour ago'],
    [2, 'hour', '2 hours ago'],
    [24, 'hour', 'yesterday'],
    [28, 'hour', 'yesterday'],
    [48, 'hour', '2 days ago'],
    [1, 'day', 'yesterday'],
    [3, 'day', '3 days ago'],
    [7, 'day', '7 days ago'],
    [1, 'month', 'last month'],
    [12, 'month', 'last year'],
    [1, 'year', 'last year'],
    [2, 'year', '2 years ago'],
  ];
  it.each(pastTimeTestCases)(
    'If "date" prop is %d %s(s) before current time, then message is "%s"',
    async (amount, unit, message) => {
      const timeInPast = new Date(DUMMY_CURRENT_DATE);
      if (unit === 'second') {
        timeInPast.setSeconds(timeInPast.getSeconds() - amount);
      } else if (unit === 'minute') {
        timeInPast.setMinutes(timeInPast.getMinutes() - amount);
      } else if (unit === 'hour') {
        timeInPast.setHours(timeInPast.getHours() - amount);
      } else if (unit === 'day') {
        timeInPast.setDate(timeInPast.getDate() - amount);
      } else if (unit === 'month') {
        timeInPast.setMonth(timeInPast.getMonth() - amount);
      } else if (unit === 'year') {
        // getYear returns number of years after 1900
        timeInPast.setYear(1900 + timeInPast.getYear() - amount);
      }
      const wrapper = makeWrapper({
        propsData: {
          date: timeInPast,
        },
      });
      expect(getTimeText(wrapper)).toEqual(message);
    },
  );
});
