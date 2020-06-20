#!/bin/sh

# convert report to json (only rows without detected buttons and without errors/notes are selected)

cat $1 | grep ':       :       :       :\s*$' \
| cut -f2 -d':' \
| sed 's/ *//g' \
| sed 's/^\(.*\)$/"\1",/'
