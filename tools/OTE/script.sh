#!/bin/bash
echo "#########################################"
echo "#                                       #"
echo "#            WELCOME TO OTE             #"
echo "#                                       #"
echo "#########################################"

go build
go test -run $TESTCASE -timeout=90m
if [ ! -d logs ]; then
       mkdir logs
fi
mv *.log logs/$TESTCASE.log
