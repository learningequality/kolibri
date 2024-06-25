import { shallowMount } from '@vue/test-utils';
import { oneWeek } from '../constants';
import EditDeviceSyncSchedule from '../EditDeviceSyncSchedule';

describe('EditDeviceSyncSchedule', () => {
  describe('computeNextSync', () => {
    // generates test cases for combinations of day of week and half-hour time interval
    // test cases focus on edge cases, rather than exhaustive testing, which would create a huge
    // number of tests.
    const testCases = [];
    const days = [0, 3, 6]; // days of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const hours = [0, 8, 23];
    for (const nowDay of days) {
      for (const nowHours of hours) {
        for (const nowMinutes of [15, 45]) {
          // current day/time
          // Jan 4th is a Sunday in 1981
          const nowDate = 4 + nowDay;
          const now = new Date(1981, 0, nowDate, nowHours, nowMinutes); // month is 0-indexed
          for (const targetDay of days) {
            for (const targetHours of hours) {
              for (const targetMinutes of [0, 30]) {
                const expected = new Date(1981, 0, nowDate, targetHours, targetMinutes);
                if (targetDay === nowDay) {
                  // same day
                  if (
                    targetHours > nowHours ||
                    (targetHours === nowHours && targetMinutes > nowMinutes)
                  ) {
                    // same day, later time
                  } else {
                    // same day, earlier time
                    expected.setDate(expected.getDate() + 7);
                  }
                } else if (targetDay > nowDay) {
                  // later day
                  expected.setDate(expected.getDate() + (targetDay - nowDay));
                } else {
                  // earlier day
                  expected.setDate(expected.getDate() + (7 - (nowDay - targetDay)));
                }
                // add to test cases
                testCases.push([
                  now.toISOString(),
                  targetHours,
                  targetMinutes,
                  targetDay,
                  expected.toISOString(),
                ]);
              }
            }
          }
        }
      }
    }
    test.each(testCases)(
      'should compute next sync date correctly given now=%s, selectedTime={hours:%i, minutes:%i}, selectedDay={value:%i}',
      async (now, hours, minutes, selectedDay, expected) => {
        // set up
        EditDeviceSyncSchedule.created = () => Promise.resolve();
        const wrapper = shallowMount(EditDeviceSyncSchedule, {
          data() {
            return {
              now: new Date(now),
              selectedItem: { value: oneWeek },
              selectedTime: { value: 1, hours, minutes },
              selectedDay: { value: selectedDay },
            };
          },
        });

        await wrapper.vm.$nextTick();

        // action
        const nextSyncDate = wrapper.vm.computeNextSync();

        // assertion
        expect(nextSyncDate.toISOString()).toBe(new Date(expected).toISOString());
      },
    );
  });
});
