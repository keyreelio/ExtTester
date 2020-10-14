#!/bin/sh

node $(dirname $0)/build/reporter.js -- --dump $1 --txt
