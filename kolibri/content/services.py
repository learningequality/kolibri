from bs4 import BeautifulSoup
import requests

from requests.exceptions import Timeout, ConnectionError


def get_kiwix_search_results(query, kiwix_port, hostname='localhost'):
    url = 'http://' + hostname + ':' + str(kiwix_port) + '/search?pattern='
    url += query  # url escaped spaces?
    url += '&start=0&end=25'
    print(url)
    try:
        html = requests.get(url, timeout=(0.1, 1)).content  # TODO: use short 0.3 sec timout for request
        return html
    except (Timeout, ConnectionError):
        return None


def parse_kiwix_search_results(html, kiwix_port, hostname='localhost'):
    doc = BeautifulSoup(html, "html.parser")
    results_ul = doc.find('div', class_='results').find('ul')
    print(results_ul)
    results_lis = results_ul.find_all('li', recursive=False)  # search only immediate children
    search_results = []
    for result_li in results_lis:
        link = result_li.find('a')
        title = link.get_text().strip()
        href = link['href']
        description = result_li.find('cite').get_text().strip()
        search_result = dict(
            link='http://' + hostname + ':' + str(kiwix_port) + href,
            title=title,
            description=description,
            zimfile=href.split('/')[1],
        )
        search_results.append(search_result)
    return search_results
