The `stresstesting` folder is a set of micro-benchmarking scripts meant to record Kolibri's performance with certain
API endpoints.

It uses [artillery.io](https://artillery.io/), a NodeJS benchmarking framework.

## Installation

```bash
$ npm install -g artillery
$ yarn install
```

## Running the scripts

`artillery` uses yml files as its main scripting file, with any extensions written in JavaScript. To run a script with
default parameters:

```bash
artillery run <script.yml>
```

To change the target URL:
```bash
artillery run <script.yml> --target=<URL>
```
