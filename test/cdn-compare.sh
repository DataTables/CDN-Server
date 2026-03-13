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
	FILE=$1

	curl -o $TMPFILE_CDN --silent "${CDN_ADDRESS}/${FILE}"
	curl -o $TMPFILE_LOCAL --silent "${LOCAL_ADDRESS}/${FILE}"

	if cmp -s $TMPFILE_CDN $TMPFILE_LOCAL; then
		echo "Pass: $FILE"
		passed=$((failed+1))
	else
		echo "FAIL: $FILE"
		failed=$((failed+1))
	fi

	rm $TMPFILE_CDN
	rm $TMPFILE_LOCAL
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
compare "dt/dt-2.0.0/datatables.js"
compare "dt/dt-2.0.0/datatables.css"
compare "dt/dt-2.0.0/datatables.min.js"
compare "dt/dt-2.0.0/datatables.min.css"

compare "dt/dt-2.3.7/datatables.js"
compare "dt/dt-2.3.7/datatables.css"
compare "dt/dt-2.3.7/datatables.min.js"
compare "dt/dt-2.3.7/datatables.min.css"

compare "dt/dt-2.3.7/b-3.2.6/b-html5-3.2.6/datatables.js"
compare "dt/dt-2.3.7/b-3.2.6/b-html5-3.2.6/datatables.css"
compare "dt/dt-2.3.7/b-3.2.6/b-html5-3.2.6/datatables.min.js"
compare "dt/dt-2.3.7/b-3.2.6/b-html5-3.2.6/datatables.min.css"

compare "bs4-4.6.0/jq-3.7.0/dt-2.3.7/cc-1.2.1/datatables.css"
compare "bs4-4.6.0/jq-3.7.0/dt-2.3.7/cc-1.2.1/datatables.js"
compare "bs4-4.6.0/jq-3.7.0/dt-2.3.7/cc-1.2.1/datatables.min.css"
compare "bs4-4.6.0/jq-3.7.0/dt-2.3.7/cc-1.2.1/datatables.min.js"

compare "bs4/jq-3.7.0/dt-2.3.7/cc-1.2.1/datatables.css"
compare "bs4/jq-3.7.0/dt-2.3.7/cc-1.2.1/datatables.js"
compare "bs4/jq-3.7.0/dt-2.3.7/cc-1.2.1/datatables.min.css"
compare "bs4/jq-3.7.0/dt-2.3.7/cc-1.2.1/datatables.min.js"

# Stop the server
kill $PID
echo "Server stopped"

# Results
echo ""
echo "Failed: ${failed}"
echo "Passed: ${passed}"
