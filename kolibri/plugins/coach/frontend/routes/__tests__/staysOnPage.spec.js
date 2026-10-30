import VueRouter from 'vue-router';
import { staysOnPage } from '../utils';
import lessonsRoutes from '../lessonsRoutes';
import groupsRoutes from '../groupsRoutes';

const CLASS_ID = 'c'.repeat(32);
const LEARNER_ID = 'a'.repeat(32);
const LESSON_PATH = `/${CLASS_ID}/lessons/l1/exercises/e1`;
const GROUP_PATH = `/${CLASS_ID}/groups/g1`;

function resolve(path) {
  return new VueRouter({ routes: [...lessonsRoutes, ...groupsRoutes] }).resolve(path).route;
}

describe('staysOnPage', () => {
  it('keeps an exercise attempt switch on the page', () => {
    const base = `${LESSON_PATH}/learners/${LEARNER_ID}/try`;
    expect(
      staysOnPage(
        resolve(`${base}/1/questions/0/interactions/0`),
        resolve(`${base}/0/questions/0/interactions/0`),
      ),
    ).toBe(true);
  });

  it('reloads an exercise learners report on a query change', () => {
    expect(
      staysOnPage(
        resolve(`${LESSON_PATH}/learners?groups=true`),
        resolve(`${LESSON_PATH}/learners`),
      ),
    ).toBe(false);
  });

  it('keeps a group lesson tab switch on the page', () => {
    expect(
      staysOnPage(
        resolve(`${GROUP_PATH}/lessons/l1/learners`),
        resolve(`${GROUP_PATH}/lessons/l1/resources`),
      ),
    ).toBe(true);
  });

  it('reloads a group lesson summary for another lesson', () => {
    expect(
      staysOnPage(
        resolve(`${GROUP_PATH}/lessons/l2/learners`),
        resolve(`${GROUP_PATH}/lessons/l1/learners`),
      ),
    ).toBe(false);
  });
});
