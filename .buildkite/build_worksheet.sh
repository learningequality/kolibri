#!/usr/bin/env bash

set -euo pipefail

SCRIPTPATH=$(pwd)
PIP_PATH="$SCRIPTPATH/env/bin/pip"
PYTHON_PATH="$SCRIPTPATH/env/bin/python"

echo "Now creating virtualenv..."
virtualenv -p python3 env
if [ $? -ne 0 ]; then
    echo ".. Abort!  Can't create virtualenv."
    exit 1
fi

PIP_CMD="$PIP_PATH install gspread==3.1.0"
echo "Running $PIP_CMD..."
$PIP_CMD
if [ $? -ne 0 ]; then
    echo ".. Abort!  Can't install '$PIP_CMD'."
    exit 1
fi

PIP_CMD="$PIP_PATH install --upgrade oauth2client"
echo "Running $PIP_CMD..."
$PIP_CMD
if [ $? -ne 0 ]; then
    echo ".. Abort!  Can't install '$PIP_CMD'."
    exit 1
fi

PIP_CMD="$PIP_PATH install PyOpenSSL"
echo "Running $PIP_CMD..."
$PIP_CMD
if [ $? -ne 0 ]; then
    echo ".. Abort!  Can't install '$PIP_CMD'."
    exit 1
fi

PYTHON_CMD="$PYTHON_PATH .buildkite/create_integration_testing_worksheet.py"
$PYTHON_CMD
if [ $? -ne 0 ]; then
    echo ".. Abort!  Can't execute '$PYTHON_CMD'."
    exit 1
fi

buildkite-agent artifact upload '.buildkite/spreadsheet-link.txt'
