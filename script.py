import os
from html.parser import HTMLParser

class VueTemplateParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.result = []
        self.tag_stack = []
        self.indent_level = 0
        self.indent_string = "    "
        self.current_parent = None
        self.radio_groups = []  # Store groups of siblings that need wrapping
        self.current_group = None
        self.in_radio_group = False
        self.changes_made = False
        self.ignore_tags = {'template', 'kmodal'}

    def handle_starttag(self, tag, attrs):
        start_tag = self.get_starttag_text()
        original_case_tag = start_tag[1:].split()[0].rstrip('>').rstrip('/')

        is_self_closing = (
            start_tag.rstrip().endswith('/>')
        )

        # Handle existing KRadioButtonGroup
        if original_case_tag.lower() == 'kradiobuttongroup':
            self.in_radio_group = True

        # Track element position and parent
        current_element = {
            'tag': original_case_tag,
            'start_position': len(self.result),
            'start_tag': start_tag,
            'indent_level': self.indent_level,
            'parent': self.tag_stack[-1] if self.tag_stack else None,
            'is_self_closing': is_self_closing
        }

        # Check for KRadioButton
        if original_case_tag.lower() == 'kradiobutton' and not self.in_radio_group:
            parent = self.tag_stack[-1] if self.tag_stack else None

            # Start a new group if we don't have one for this parent
            if not self.current_group or self.current_group['parent'] != parent:
                if self.current_group:
                    self.radio_groups.append(self.current_group)
                self.current_group = {
                    'parent': parent,
                    'indent_level': self.indent_level,
                    'elements': [],
                    'start_position': len(self.result)
                }

            self.current_group['elements'].append(current_element)
            self.changes_made = True

        # Add current element to group if we're collecting siblings
        elif self.current_group and not self.in_radio_group:
            if current_element['parent'] == self.current_group['parent']:
                self.current_group['elements'].append(current_element)

        # Add the content
        if self.result and self.result[-1].strip():
            self.result.append('\n' + self.indent_level * self.indent_string)
        self.result.append(start_tag)

        if not is_self_closing:
            self.tag_stack.append(original_case_tag)
            self.indent_level += 1

    def handle_endtag(self, tag):
            if not self.tag_stack:
                return

            current_tag = self.tag_stack[-1]
            if tag.lower() == current_tag['tag'].lower():
                self.indent_level -= 1

                if self.result and self.result[-1].strip():
                    self.result.append('\n' + self.indent_level * self.indent_string)

                # Exiting KRadioButtonGroup
                if tag.lower() == 'kradiobuttongroup':
                    self.in_radio_group = False

                if (self.current_group and
                    self.current_group['parent'] and
                    self.current_group['parent'].lower() == tag.lower()):
                    self.current_group['end_position'] = len(self.result)
                    self.radio_groups.append(self.current_group)
                    self.current_group = None

                # Capture child content before closing the tag
                if current_tag['children']:
                    self.result.append('\n'.join(current_tag['children']))

                self.result.append(f"</{current_tag['tag']}>")
                self.tag_stack.pop()

    def handle_data(self, data):
            if data.strip():
                if self.tag_stack:
                    # Add child content to the parent if we are inside a tag
                    self.tag_stack[-1]['children'].append(self.indent_string * self.indent_level + data.strip())
                else:
                    self.result.append(data.strip())

    def handle_comment(self, data):
        if self.result and self.result[-1].strip():
            self.result.append('\n' + self.indent_level * self.indent_string)
        self.result.append(f"<!--{data}-->")

    def get_parsed_html(self):
        # Finalize any remaining group
        if self.current_group:
            self.current_group['end_position'] = len(self.result)
            self.radio_groups.append(self.current_group)

        # Process the template and wrap radio button groups
        new_result = []
        i = 0
        while i < len(self.result):
            # Check if current position starts a radio group
            current_group = None
            for group in self.radio_groups:
                if group['start_position'] == i:
                    current_group = group
                    break

            if current_group:
                # Add opening indent
                indent = current_group['indent_level'] * self.indent_string
                new_result.append('\n' + indent + '<KRadioButtonGroup>\n')

                # Add all elements in the group
                for element in current_group['elements']:
                    # Add the element with proper indentation
                    element_indent = (current_group['indent_level'] + 1) * self.indent_string
                    new_result.append(element_indent + element['start_tag'])
                    if element['is_self_closing']:
                        new_result.append('\n')
                    else:
                        # Find the corresponding end tag in the original result
                        start_pos = element['start_position']
                        end_pos = None
                        depth = 0
                        for j in range(start_pos + 1, len(self.result)):
                            if self.result[j].strip().startswith(f"</{element['tag']}>") and depth == 0:
                                end_pos = j
                                break
                            elif self.result[j].strip().startswith('</'):
                                depth -= 1
                            elif self.result[j].strip().startswith('<') and not self.result[j].strip().endswith('/>'):
                                depth += 1

                        if end_pos is not None:
                            # Add the content between start and end tags
                            content = self.result[start_pos + 1:end_pos]
                            for line in content:
                                if line.strip():
                                    new_result.append('\n' + element_indent + self.indent_string + line.strip())
                            new_result.append('\n' + element_indent + f"</{element['tag']}>\n")

                # Add closing tag for the group
                new_result.append(indent + f"</KRadioButtonGroup>\n{(current_group['indent_level']-1) * self.indent_string}</{current_group['parent']}>\n")

                # Skip past the wrapped content
                i = current_group['end_position'] + 1
                continue

            new_result.append(self.result[i])
            i += 1

        # Clean up and return
        result = ''.join(new_result)
        lines = result.split('\n')
        cleaned_lines = [line for line in lines if line.strip()]
        return '\n'.join(cleaned_lines)

def process_file(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()
    parser = VueTemplateParser()
    parser.feed(content)
    formatted_html = parser.get_parsed_html()

    # Only write to file if changes were made
    if parser.changes_made:
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(formatted_html)
        print(f"Modified: {file_path}")
    else:
        print(f"No changes needed for: {file_path}")

def process_directory(directory_path):
    print(f"Processing directory: {directory_path}")
    vue_files_processed = 0
    files_modified = 0
    for root, dirs, files in os.walk(directory_path):
        for file_name in files:
            if file_name.endswith(".vue"):
                file_path = os.path.join(root, file_name)
                process_file(file_path)
                vue_files_processed += 1
    print(f"Processed {vue_files_processed} Vue files")

if __name__ == "__main__":
    start_dir = os.getcwd()
    print(f"Processing Vue files in directory: {start_dir}")
    process_directory(start_dir)
    print("Processing complete.")
