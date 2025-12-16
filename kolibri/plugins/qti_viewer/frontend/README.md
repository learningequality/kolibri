# QTI Viewer Code Architecture

## Overall Architecture Approach

The QTI Viewer follows a **hierarchical data flow architecture** using provide/inject pattern to allow two way data flow when there are clearly defined component ancestors and descendants, but we cannot depend on direct parent/child relationships to use props and events.

## Provide/Inject Data Flow Pattern

Each level provides specific concerns to its children:

### QTIViewer
- Provides assessment-level context
- Provides event handlers for interaction tracking and answer submission

### AssessmentItem
- Consumes XML document and extracts QTI variable declarations
- Provides response variable registry to all interaction components
- Registers answer checking capability with parent

### Item Body
- The item body of the assessment item is rendered using the SafeHTML component
- Allows intermixed HTML, MathML, and QTI XML to be rendered together
- Each interaction type is registered against the SafeHTML component to allow it to be rendered according to its corresponding QTI XML tag

### Interactions
- Consume response variables and bind to specific identifiers
- Provide selection/input functions to child elements
- Handle user interactions and update response variable state reactively
