#!/bin/bash

run_test() {
	testfile=$1
	url=$(head -1 $testfile)
	expected=$(tail -1 $testfile)

	printf "[%-40s] %-5s %s\n" $testfile $expected $url
	rm -f ${TMPFILE}
	result=$(curl -o $TMPFILE --silent localhost:$DT_CDN_SERVER_PORT/$url --write-out "%{http_code}")
	if [ $result -eq $expected ] ; then
		if [ $result -eq "200" ] ; then
			if [ "$(md5sum $testfile.out | cut -d ' ' -f 1)" != "$(md5sum $TMPFILE  | cut -d ' ' -f 1)" ] ; then
				failed=$((failed+1))
				echo "FAILED: $testfile"
				#echo "expected $expected >>>"
				#cat $testfile.out
				#echo "got $result >>>"
				#cat $TMPFILE
			else
				passed=$((passed+1))
			fi
		else
			passed=$((passed+1))
		fi
	else
		failed=$((failed+1))
		echo "FAILED: $testfile - expected $expected, got $result"
	fi
}

#############################
# A few constants
export DT_CDN_SERVER_PORT=8090
TMPFILE=/tmp/wget.out.$$

failed=0
passed=0

#############################
echo "Starting server"
git pull
npm run build
node ./dist/Server.js --configLoc $PWD/test/config.json &

sleep 2

for testfile in $(ls -1 test/scripts/*.test) ; do
	run_test $testfile
done

PID=$(jobs -p)
echo "Stopping server $PID" 
kill $PID

echo "Tests complete: $passed passed, $failed failed"
exit $failed
