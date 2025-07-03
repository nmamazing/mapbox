#!/bin/bash

npm-upgrade &&
npm i &&
npx tsc &&
npm run build