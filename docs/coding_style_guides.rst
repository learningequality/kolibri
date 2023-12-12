.. _coding_style_guides:

Coding Style Guides
===============

The Kolibri software is primarily written in:

#. **Python**. The backend of Kolibri is written in Python, using the Django web framework. This includes the server logic, data models, and APIs.
#. **JavaScript**. The frontend interface of Kolibri is built using JavaScript, utilizing the Vue.js framework. This part of the codebase is responsible for the interactive elements of the user interface.
#. **HTML/CSS**. Web content is structured and styled with HTML and CSS.

Changes to Kolibri code should conform to the respective coding language Google Style Guides.

Python
------

Changes to Python code should conform to the `Google Python Style Guide`_ and the following guidelines:

- **Indentation**: 4 spaces per indentation level, no tabs.
- **Line Length**: Keep lines to 79 characters.
- **Imports**: Prefer absolute imports and avoid `from module import *`.
- **Documentation Strings**: Follow reStructuredText as per `PEP 287`_.
- **Linting**: Utilize `flake8` for linting and `black` for auto-formatting.

.. _Google Python Style Guide:
   https://google.github.io/styleguide/pyguide.html
.. _PEP 287:
   https://www.python.org/dev/peps/pep-0287/

JavaScript
----------

Changes to JavaScript code should conform to the `Google JavaScript Style Guide`_ and the following guidelines:

- **Indentation**: 2 spaces for indentation.
- **Naming**: Use camelCase for variables and PascalCase for classes.
- **Curly Braces**: Place opening braces on the same line.
- **Semicolons**: End lines with semicolons.
- **Linting**: Employ `eslint` with the project's configuration.

.. _Google JavaScript Style Guide:
   https://google.github.io/styleguide/jsguide.html

HTML/CSS
--------

Changes to HTML and CSS code should conform to the `Google HTML/CSS Style Guide`_ and the following guidelines:

- **HTML**: Use HTML5 with semantic markup and 2 spaces for indentation.
- **Class Names**: Use hyphenated lowercase for class names.

.. _Google HTML/CSS Style Guide:
   https://google.github.io/styleguide/htmlcssguide.html
