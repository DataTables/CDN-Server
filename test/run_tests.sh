#!/bin/bash

run_test() {
	testfile=$1
	url=$(head -1 $testfile)
	expected=$(tail -1 $testfile)

	printf "[%-40s] %-5s %s\n" $testfile $expected $url
	result=$(curl -o $TMPFILE --silent localhost:$DT_CDN_SERVER_PORT/$url --write-out "%{http_code}")
	if [ $result -eq $expected ] ; then
		if [ $result -eq "200" ] ; then
			if [ "$(md5sum $testfile.out | cut -d ' ' -f 1)" != "$(md5sum $TMPFILE  | cut -d ' ' -f 1)" ] ; then
				failed=$((failed+1))
				echo "FAILED: $testfile: contents different"
				echo "expected"
				echo "##########################"
				cat $testfile.out
				echo "##########################"
				echo "got"
				echo "##########################"
				cat $TMPFILE
				echo "##########################"
				diff $testfile.out $TMPFILE
				echo "##########################"
			else
				passed=$((passed+1))
			fi
		else
			passed=$((passed+1))
		fi
	else
		failed=$((failed+1))
		echo "FAILED: $testfile: HTTP status different: expected $expected, got $result"
	fi

	rm -f ${TMPFILE}
}

#############################
# A few constants
export DT_CDN_SERVER_PORT=8090

TMPFILE="/tmp/wget.out.$$"
CONFFILE="test/config.json"

failed=0
passed=0

#############################

echo "Starting server with empty config"
node ./dist/server.js --configLoc $CONFFILE &
sleep 2

# Get the PID of the server
PID=$(jobs -p)

# Run through all the script directories

for i in `ls -1d test/scripts/*` ; do
	echo "Loading $(basename $i) config into server"
	cp $i/config.json $CONFFILE

	kill -SIGUSR1 $PID
	sleep 2

	for testfile in $(ls -1 $i/*.test) ; do
		run_test $testfile
	done


done

echo "Stopping server $PID" 
kill $PID

echo "Tests complete: $passed passed, $failed failed"
exit $failed
