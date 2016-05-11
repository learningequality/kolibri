
const logging = require('loglevel');

// This is aliased for your convenience!
const KolibriModule = require('kolibri_module');

const LearnModule = KolibriModule.extend({

  start(plugin) {
    // This is called on the kolibri_register event
    // make sure it is this plugin that has registered.
    if (this === plugin) {
      logging.info('Learn Started');
      document.addEventListener('DOMContentLoaded', () => { this.render(); });
    }
  },
  render() {
    const content = document.getElementById('content-main');
    const renderArea = document.getElementById('content-render');
    const buttons = [
      {
        id: 'video',
        event: 'video/mp4',
      },
      {
        id: 'audio',
        event: 'audio/mp3',
      },
      {
        id: 'pdf',
        event: 'document/pdf',
      },
    ];
    buttons.forEach((button) => {
      const buttonNode = document.createElement('button');
      buttonNode.id = button.id;
      buttonNode.innerHTML = button.id;
      buttonNode.onclick = () => {
        this.trigger(`content_render: ${button.event}`, button, renderArea);
      };
      content.appendChild(buttonNode);
    });
  },
});


module.exports = new LearnModule();
