function ignoreHeldEnter(button) {
  function preventRepeat(event) {
    if (event.key === 'Enter' && event.repeat) {
      event.preventDefault();
    }
  }
  function release(event) {
    if (event.type === 'blur' || event.key === 'Enter') {
      button.removeEventListener('keydown', preventRepeat);
      button.removeEventListener('keyup', release);
      button.removeEventListener('blur', release);
    }
  }
  button.addEventListener('keydown', preventRepeat);
  button.addEventListener('keyup', release);
  button.addEventListener('blur', release);
}

export default function handOffQuestionNavigationFocus(focused, buttons) {
  if (focused?.disabled && buttons.includes(focused)) {
    const receiver = buttons.find(button => !button.disabled);
    if (receiver) {
      receiver.focus();
      ignoreHeldEnter(receiver);
    }
  }
}
