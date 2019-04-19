import user_agents
from django.conf import settings


browser_requirements = [
    {
        'family': 'IE',
        'major_version': 11,
    },
    {
        'family': 'Android',
        'major_version': 4,
        'minor_version': 0,
        'patch_version': 2,
    },
]


def pass_browser_entry(agent, entry):
    if agent.browser.family == entry['family']:
        if 'blacklist' in entry and entry['blacklist']:
            return False
        if 'major_version' in entry:
            major_ok = agent.browser.version[0] >= entry['major_version']
            if 'minor_version' in entry:
                minor_ok = agent.browser.version[1] >= entry['minor_version']
                if 'patch_version' in entry:
                    patch_ok = agent.browser.version[2] >= entry['patch_version']
                    return major_ok and minor_ok and patch_ok
                return major_ok and minor_ok
            return major_ok
    return True


def supported_browser(request):
    if 'supported_browser' not in request.session:

        user_agent = user_agents.parse(request.META.get('HTTP_USER_AGENT', ''))
        request.session['supported_browser'] = all(
            pass_browser_entry(user_agent, entry) for entry in browser_requirements)
    return {'supported_browser': request.session['supported_browser']}


def developer_mode(request):
    return {'developer_mode': getattr(settings, 'DEVELOPER_MODE', False)}
