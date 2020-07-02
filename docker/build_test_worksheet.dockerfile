FROM python:3.5-slim

WORKDIR /kolibri

COPY integration_testing integration_testing/

WORKDIR /kolibri/.buildkite

COPY .buildkite/create_integration_testing_worksheet.py \
  requirements/build_test_worksheet.txt ./

RUN pip install -r build_test_worksheet.txt

CMD ["python", "create_integration_testing_worksheet.py"]
