#!/bin/bash
#############################
# A few constants
DT_CDN_SERVER_PORT=8090

TMPFILE="/tmp/wget.out.$$"
CONFFILE="test/config.json"
PID=""

failed=0
passed=0


################################################
convert_file() {
	# parse the tmpfile to remove varying fields (such as timestamps)
	sed -ri 's/\"returnTime\":[0-9]+//' $TMPFILE

	# Add a newline onto the end if one not present
	if [ $(wc -l $TMPFILE | cut -d ' ' -f 1) -eq 0 ] ; then
		echo "" >> $TMPFILE
	fi
}

################################################
remove_temp_file() {
	# remove the temp working file
	rm -f ${TMPFILE}
}

################################################
run_test() {
	url=$1
	expected=$2
	outfile=$3

	remove_temp_file

	result=$(curl -o $TMPFILE --silent localhost:$DT_CDN_SERVER_PORT/$url --write-out "%{http_code}")
	if [ $result -eq $expected ] ; then
		if [ $result -eq "200" ] ; then
			convert_file
			if [ "$(md5sum $outfile | cut -d ' ' -f 1)" != "$(md5sum $TMPFILE  | cut -d ' ' -f 1)" ] ; then
				show_fail
				printf "\n*** FAILED: contents different"
				printf "\n... EXPECTED\n"
				printf "##########################\n"
				cat $outfile
				printf "##########################"
				printf "\n... GOT\n"
				printf "##########################\n"
				cat $TMPFILE
				printf "##########################"
				printf "\n... DIFF\n"
				printf "##########################\n"
				diff $outfile $TMPFILE
				printf "##########################\n\n"
			else
				show_pass
			fi
		else
				show_pass
		fi
	else
		show_fail
		echo "*** FAILED: HTTP status different: expected $expected, got $result"
	fi
}

################################################
start_server() {
	echo "Starting server on port [$DT_CDN_SERVER_PORT]"

	# Needs some config for the server to start so just copy in from one test
	cp test/scripts/no.requires/config.json $CONFFILE

	node ./dist/server.js -p $DT_CDN_SERVER_PORT --configLoc $CONFFILE > /dev/null 2>&1 &
	sleep 2

	# Get the PID of the server
	PID=$(jobs -p)

	echo "Server started [$PID]"
}


################################################
signal_server() {
	printf "Signalling server [%s] to use config for %s\n" $PID $1
	cp $1 $CONFFILE
	kill -SIGUSR1 $PID

	sleep 2
}

################################################
stop_server() {
	printf "\n\nStopping server [%s]" $PID
	kill $PID
}


################################################
show_test() {
	thisdesc="$1"
	thisurl="$2"

	(( ${#thisdesc} > 39 )) && thisdesc="${thisdesc:0:37}..."
	(( ${#thisurl} > 39 )) && thisurl="${thisurl:0:37}..."

	printf "[%-40s] [%-40s] " "$thisdesc" "$thisurl"
}

################################################
show_status() {
	printf "[%-s]\n" "$1"
}

################################################
show_fail() {
	failed=$((failed+1))
	show_status "FAIL"
}

################################################
show_pass() {
	passed=$((passed+1))
	show_status "PASS"
}

################################################
get_tests() {
	printf "\n=======================================================\n"
	printf "Running tests from suite %s\n\n" $1
	show_test "Description" "URL"
	show_status "Status"
	
	# Keep looping through until we get null for the description
	num=1
	description=""

	passed_at_start=$passed
	failed_at_start=$failed
	
	while true ; do
		description=$(jq -r ".[$num].description" < $1)

		if [ $? -ne 0 ] ; then
			failed=$((failed+1))
			echo "FATAL ERROR: cannot parse JSON file"
			break
		fi
	
		[ "$description" = "null" ] && break

		url=$(jq -r ".[$num].url" < $1)
		response=$(jq -r ".[$num].response" < $1)
		outfile=$(jq -r ".[$num].outfile" < $1)

		show_test "$description" "$url" 
		run_test "$url" "$response" "$(dirname $1)/$outfile"

		num=$((num+1))
	done

	printf "\nSuite %s tests complete: %s passed, %s failed\n" $1 $((passed-passed_at_start)) $((failed-failed_at_start))
}

#############################

start_server

# Run through all the script directories
for dir in `ls -1d test/scripts/*` ; do
	echo ""
	echo "#########################################"
	echo "Loading $(basename $dir) config into server"
	echo "#########################################"
	echo ""

	for conf in `ls -1 $dir/config.*json` ; do
		# Can have multiple config files in each directory
		signal_server $conf

		for testfile in $(ls -1 $dir/test*.json) ; do
			get_tests $testfile
		done
	done
done

stop_server

remove_temp_file

printf "\n\nAll tests complete: %s passed, %s failed\n" $passed $failed
exit $failed
