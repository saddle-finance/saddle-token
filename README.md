# Saddle Token

[![codecov](https://codecov.io/gh/saddle-finance/saddle-token/branch/master/graph/badge.svg?token=CWHFZJAFN3)](https://codecov.io/gh/saddle-finance/saddle-token)
[![CI](https://github.com/saddle-finance/saddle-token/workflows/CI/badge.svg)](https://github.com/saddle-finance/saddle-token/actions?query=workflow%3ACI)


This repo includes the main ERC20 contract for the Saddle token and the vesting contracts. 

The deployer can set whether the token should be paused at deployment. If so, then the token is not transferrable for a specified amount of time. 
After the pause period is over, the governance can call `changeTransferability(bool)` function to change the transferability of the token.

## Running tests
```bash
$ npm install
$ npm run test
```

## Running coverage tests
```bash
$ npm install
$ npm run coverage
```

