REQUIREMENTS=requirements.txt
REQUIREMENTS_CEXT=requirements/cext.txt

.PHONY: help clean clean-pyc clean-build list test test-all coverage docs release sdist

help:
	@echo "clean-build - remove build artifacts"
	@echo "clean-pyc - remove Python file artifacts"
	@echo "lint - check style with flake8"
	@echo "test - run tests quickly with the default Python"
	@echo "testall - run tests on every Python version with tox"
	@echo "coverage - check code coverage quickly with the default Python"
	@echo "docs - generate Sphinx HTML documentation, including API docs"
	@echo "release - package and upload a release"
	@echo "dist - package"
	@echo "writeversion - updates the kolibri/VERSION file"

clean: clean-build clean-pyc clean-docs clean-static

clean-static:
	yarn run clean

clean-build:
	rm -f kolibri/VERSION
	rm -fr build/
	rm -fr dist/
	rm -fr dist-packages-cache/
	rm -fr dist-packages-temp/
	rm -fr *.egg-info
	rm -fr .eggs
	rm -fr .cache
	rm -r kolibri/dist/* || true # remove everything
	git checkout -- kolibri/dist # restore __init__.py
	rm -r kolibri/utils/build_config/* || true # remove everything
	git checkout -- kolibri/utils/build_config # restore __init__.py
	rm -r requirements.txt || true # remove requirements.txt
	git checkout -- requirements.txt # restore requirements.txt

clean-pyc:
	find . -name '*.pyc' -exec rm -f {} +
	find . -name '*.pyo' -exec rm -f {} +
	find . -name '*~' -exec rm -f {} +

clean-docs:
	rm -f docs-developer/py_modules/kolibri*rst
	rm -f docs-developer/py_modules/modules.rst
	$(MAKE) -C docs clean
	$(MAKE) -C docs-developer clean

lint:
	flake8 kolibri

test:
	python setup.py test

test-all:
	tox

assets: staticdeps
	yarn install
	yarn run build

coverage:
	coverage run --source kolibri setup.py test
	coverage report -m

docs-developer: clean-docs
	sphinx-apidoc -d 10 -H "Python Reference" -o docs-developer/py_modules/ kolibri kolibri/test kolibri/deployment/ kolibri/dist/
	$(MAKE) -C docs-developer html

docs-user: clean-docs
	$(MAKE) -C docs html

docs: docs-user docs-developer

release:
	ls -l dist/
	read "\nDo you want to upload everything in dist/*?\n\n CTRL+C to exit."
	twine upload -s dist/*

staticdeps:
	rm -r kolibri/dist/* || true # remove everything
	git checkout -- kolibri/dist # restore __init__.py
	pip install -t kolibri/dist -r $(REQUIREMENTS)
	python install_cexts.py --file $(REQUIREMENTS_CEXT) # pip install c extensions
	rm -r kolibri/dist/*.dist-info  # pip installs from PyPI will complain if we have more than one dist-info directory.

writeversion:
	python -c "import kolibri; print(kolibri.__version__)" > kolibri/VERSION

setrequirements:
	rm -r requirements.txt || true # remove requirements.txt
	git checkout -- requirements.txt # restore requirements.txt
	python build_tools/customize_requirements.py

buildconfig:
	rm -r kolibri/utils/build_config/* || true # remove everything
	git checkout -- kolibri/utils/build_config # restore __init__.py
	python build_tools/customize_build.py

dist: setrequirements writeversion staticdeps buildconfig assets compilemessages
	pip install -r requirements/build.txt
	python setup.py sdist --format=gztar,zip --static > /dev/null # silence the sdist output! Too noisy!
	python setup.py bdist_wheel --static
	ls -l dist

pex: writeversion
	ls dist/*.whl | while read whlfile; do pex $$whlfile --disable-cache -o dist/kolibri-`cat kolibri/VERSION`.pex -m kolibri --python-shebang=/usr/bin/python; done

makedocsmessages:
	make -C docs/ gettext
	cd docs && sphinx-intl update -p _build/locale -l en

makemessages: assets makedocsmessages
	python -m kolibri manage makemessages -- -l en --ignore 'node_modules/*' --ignore 'kolibri/dist/*' --ignore 'docs/conf.py'

compilemessages:
	python -m kolibri manage compilemessages

syncmessages: ensurecrowdinclient uploadmessages downloadmessages distributefrontendmessages

ensurecrowdinclient:
	ls -l crowdin-cli.jar || wget https://storage.googleapis.com/le-downloads/crowdin-cli/crowdin-cli.jar # make sure we have the official crowdin cli client

uploadmessages:
	java -jar crowdin-cli.jar upload sources -b `git symbolic-ref HEAD | xargs basename`

downloadmessages:
	java -jar crowdin-cli.jar download -b `git symbolic-ref HEAD | xargs basename`

dockerenvclean:
	docker container prune -f
	docker image prune -f

dockerenvbuild: writeversion
	docker image build -t learningequality/kolibri:$$(cat kolibri/VERSION) -t learningequality/kolibri:latest .

dockerenvdist: writeversion
	docker run --env-file ./env.list -v $$PWD/dist:/kolibridist learningequality/kolibri:$$(cat kolibri/VERSION)

kolibripippex:
	git clone https://github.com/learningequality/pip.git
	cd pip && python setup.py bdist_wheel && pex -m pip dist/*.whl -o kolibripip.pex && mv kolibripip.pex ../
