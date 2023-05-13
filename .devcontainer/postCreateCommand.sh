pip install -r requirements.txt --upgrade
pip install -r requirements/dev.txt --upgrade
pip install -e .
exit

# manually
nvm install v16.20.0
nvm use v16.20.0
npm install -g yarn
yarn install
