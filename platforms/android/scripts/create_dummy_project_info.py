from string import Template

with open('project_info.template', 'r') as pi_template_file, open('./project_info.json', 'w') as pi_file:
    pi_template = Template(pi_template_file.read())
    pi = pi_template.substitute(apk_version='0', build_number='0')
    pi_file.write(pi)
