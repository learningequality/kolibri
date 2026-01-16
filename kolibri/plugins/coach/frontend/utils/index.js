const ratio = question => {
  return question.correct / question.total;
};

export const getDifficultQuestions = questions => {
  return questions
    .filter(question => {
      // Arbitrarily filter out questions that have higher than 80% correct rate
      return question.correct / question.total < 0.8;
    })
    .sort((question1, question2) => {
      // Sort first by raw correct
      if (ratio(question1) > ratio(question2)) {
        return 1;
      } else if (ratio(question2) > ratio(question1)) {
        return -1;
        // If they are equal, prioritize questions in which we have the highest
        // number of answers
      } else if (question1.total > question2.total) {
        return -1;
      } else if (question2.total > question1.total) {
        return 1;
      }
      // Nothing between them!
      return 0;
    });
};

/**
 * Override the route with a new one, preserving the params and query
 */
export function overrideRoute(route, newRoute) {
  const { params, query } = route;
  return {
    ...newRoute,
    params: {
      ...params,
      ...newRoute.params,
    },
    query: {
      ...query,
      ...newRoute.query,
    },
  };
}

/*
 * Checks if the element is focusable.
 * @param {HTMLElement} el - The element to check.
 * @returns {boolean} - True if the element is focusable, false otherwise.
 */
export const isFocusable = el => {
  if (el.tabIndex < 0) {
    return false;
  }
  if (el.offsetParent === null && window.getComputedStyle(el).position !== 'fixed') {
    // If the element or any of its ancestors is set display none,
    // it will have offsetParent set to null. If the element is fixed, it will also
    // have offsetParent set to null, but this doesnt means it has display none.
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
    return false;
  }
  switch (el.tagName) {
    case 'A':
      return !!el.href;
    case 'INPUT':
      return el.type !== 'hidden' && !el.disabled;
    case 'SELECT':
    case 'TEXTAREA':
    case 'BUTTON':
      return !el.disabled;
    default:
      return false;
  }
};

const focusableSelectors = ['button', 'a', 'input', 'select', 'textarea'];

export const getFirstFocusableElement = el => {
  if (!el) return null;

  return Array.from(el.querySelectorAll(focusableSelectors.join(','))).find(isFocusable);
};

export const getLastFocusableElement = el => {
  if (!el) return null;

  const focusableElements = Array.from(el.querySelectorAll(focusableSelectors.join(',')));

  for (let i = focusableElements.length - 1; i >= 0; i--) {
    if (isFocusable(focusableElements[i])) {
      return focusableElements[i];
    }
  }
};
