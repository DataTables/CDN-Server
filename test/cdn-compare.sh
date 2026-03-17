#!/bin/bash

# This script will read files from the live CDN, the local version and then
# compare the two, making sure that they match. This allows any local
# development to be sure that it will produce the same output as the CDN before
# deploying the changes.

# A few constants
DT_CDN_SERVER_PORT=8090

TMPFILE_CDN="/tmp/curl.out.cdn"
TMPFILE_LOCAL="/tmp/curl.out.local"
CONFFILE="datatables-cdn.config.json"
CDN_ADDRESS="https://cdn.datatables.net/v"
LOCAL_ADDRESS="http://192.168.234.234:${DT_CDN_SERVER_PORT}"
PID=""

failed=0
passed=0

# Compare function
compare() {
	FILE="$1"

	curl -o $TMPFILE_CDN --silent "${CDN_ADDRESS}/${FILE}"
	curl -o $TMPFILE_LOCAL --silent "${LOCAL_ADDRESS}/${FILE}"

	if cmp -s $TMPFILE_CDN $TMPFILE_LOCAL; then
		echo "Pass: $FILE"
		passed=$((passed+1))
	else
		echo "FAIL: $FILE"
		failed=$((failed+1))
	fi

	rm $TMPFILE_CDN
	rm $TMPFILE_LOCAL
}

# Run compare on the standard set of files
compare_files() {
	MODULES="$1"

	compare "${MODULES}/datatables.js"
	compare "${MODULES}/datatables.css"
	compare "${MODULES}/datatables.min.js"
	compare "${MODULES}/datatables.min.css"
}

# Check that the cache is available
if [ ! -d ~/cache ]; then
	echo "ERROR: No cache directory, which is required."
	echo "You probably need to run the following (DT dev env):"
	echo "  ln -s cdn-releases cache"
	exit
fi

# Start the server
node ./dist/server.js -p $DT_CDN_SERVER_PORT \
	--configLoc datatables-cdn.config.json > /dev/null 2>&1 &
sleep 2

# Get the PID of the server
PID=$(jobs -p)
echo "Server running"

# Run tests
compare_files "dt/dt-2.0.0"
compare_files "dt/dt-2.3.7"
compare_files "dt/dt-2.3.7/b-3.2.6/b-html5-3.2.6"
compare_files "bs4-4.6.0/jq-3.7.0/dt-2.3.7/cc-1.2.1"
compare_files "bs4/jq-3.7.0/dt-2.3.7/cc-1.2.1"
compare_files "bm/jq-3.7.0/dt-2.3.7/cr-2.1.2/sc-2.4.3"
compare_files "bs5/dt-2.2.0/date-1.5.0"
compare_files "dt/dt-1.13.11"
compare_files "dt/dt-1.13.11/b-2.4.2"
compare_files "bs5/jq-3.7.0/dt-2.3.7/af-2.7.1/b-3.2.6/b-colvis-3.2.6/b-html5-3.2.6/cr-2.1.2/cc-1.2.1/date-1.6.3/fc-5.0.5/fh-4.0.6/kt-2.12.2/r-3.0.8/rg-1.6.0/rr-1.5.1/sc-2.4.3/sb-1.8.4/sp-2.3.5/sl-3.1.3/sr-1.4.3"
compare_files "dt/dt-2.1.0/cc-1.0.0"
compare_files "se/dt-2.3.7/cc-1.2.1/sl-3.1.3"

# Stop the server
kill $PID
echo "Server stopped"

# Results
echo ""
echo "Failed: ${failed}"
echo "Passed: ${passed}"
