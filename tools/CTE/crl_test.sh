#!/bin/bash

: ${TESTCASE:=gencrl}
CurrentDirectory=$(cd `dirname $0` && pwd)
FABRIC_CA="$(echo $CurrentDirectory | awk -F'/fabric-test/' '{print $1}')/fabric-ca"
SCRIPTDIR="$FABRIC_CA/scripts/fvt"
CA_CFG_PATH="/tmp/$TESTCASE"
CONFIGFILE="$CA_CFG_PATH/runFabricCaFvt.yaml"
ADMINUSER="admin"
NOTADMINUSER="notadmin"
ADMINCERT="$CA_CFG_PATH/$ADMINUSER/msp/signcerts/cert.pem"
USERCERT1="$CA_CFG_PATH/testUser/msp/signcerts/cert.pem"
USERCERT2="$CA_CFG_PATH/testUser2/msp/signcerts/cert.pem"
. $SCRIPTDIR/fabric-ca_utils
RC=0
export CA_CFG_PATH

function checkCrl() {
   fabric-ca-client gencrl -H $CA_CFG_PATH/$ADMINUSER --expireafter   $1 \
                                                 --expirebefore  $2 \
                                                 --revokedafter  $3 \
                                                 --revokedbefore $4
   shift 4
   r="$(openssl crl -noout -text -in $CA_CFG_PATH/$ADMINUSER/msp/crls/crl.pem |
             awk '/Serial Number:/ {printf $NF" "}')"
   echo "Looking for certificates ($r)"
   if test "$*" = ""; then
      test -z "$r" || ErrorMsg "crl should have been emtpy"
   else
      for s in $@; do
         echo "$r" | grep "$s" || ErrorMsg "failed to find cert with sn: $s"
      done
   fi
}

function formatDate() {
   date --rfc-3339=seconds -d "$1" | sed 's/ /T/'
}

for db in sqlite3 mysql postgres; do
   $SCRIPTDIR/fabric-ca_setup.sh -R
   $SCRIPTDIR/fabric-ca_setup.sh -I -X -D -d $db
   #  This is unnecessarily complicated by the fact that config does not
   #   explicitly support notbefore/notafter. cfssl unilaterally rounds to
   #   the nearest minute and backdates the certificate, so we must work
   #   within these parameters. As a consequnce, the certificate will expire
   #   35 seconds from creation.
   sed -i '/signing/,/^[^ ]/ s@^@#@; s@#csr:@csr:@' $CONFIGFILE
   cat >> $CONFIGFILE <<EOF
signing:
  default:
    usage:
      - digital signature
    expiry: 40s
    backdate: 5s
EOF

   $SCRIPTDIR/fabric-ca_setup.sh -S -X -D -d $db

   # A. Expiry windows
   #         etime1  etime2
   #| | | | | | | | | | | | | | | | | | | | |
   #          |       |
   #          c1      c2
   #a-----b includes neither
   #      a-------b  only includes c1
   #      a---------------b includes both c1 and c2
   #              a-------b only includes c2
   #                      a-----b includes neither
   #
   # B. Revoke windows
   #        rtime1  rtime2
   #| | | | | | | | | | | | | | | | | | | |
   #          |       |
   #          c1      c2
   #a-----b includes neither
   #      a-------b  only includes c1
   #      a---------------b includes both c1 and c2
   #              a-------b only includes c2
   #                      a-----b includes neither
   #

   # Since we can't set the start/end date,
   # at least we can set the start time. This makes the
   # expiry predictable.
   while test $(date "+%S") -gt 3 ; do sleep .5; done
   starttime=$(date -d "$(date)" --rfc-3339=seconds | sed 's/ /T/')
   # window1
   a1=$(formatDate "$starttime-1min"); b1=$(formatDate "$starttime-10sec")
   # window2
   a2=$(formatDate "$starttime-10sec"); b2=$(formatDate "$starttime+50sec")
   # window3
   a3=$(formatDate "$starttime-10sec"); b3=$(formatDate "$starttime+120sec")
   # window4
   a4=$(formatDate "$starttime+50sec"); b4=$(formatDate "$starttime+120sec")
   # window5
   a5=$(formatDate "$starttime+120sec"); b5=$(formatDate "$starttime+180sec")

   ### START
   # before starttime enroll $ADMINUSER
   enroll
   # for debugging, compare current time and expiry

   # at starttime enroll testUser,revoke testUser
   enroll testUser user1
   fabric-ca-client revoke -e testUser -H $CA_CFG_PATH/$ADMINUSER
   openssl x509 -in $USERCERT1 -noout -startdate -enddate; date
   s1=$(openssl x509 -noout -in $CA_CFG_PATH/testUser/msp/signcerts/cert.pem -serial | awk -F'=' '{print $2}')

   printf "testUser Revoke date ==========> "
   case  $db in
      postgres) $SCRIPTDIR/fabric-ca_setup.sh -d postgres -D -L | awk '$1=="testUser" {print $17}' ;;
      sqlite3)  $SCRIPTDIR/fabric-ca_setup.sh -L -x /tmp/gencrl -D  | awk -F'|' '$1~/testUser$/ {print $8}' ;;
      mysql)    $SCRIPTDIR/fabric-ca_setup.sh -L -D -d mysql 2>&1|awk '/Certificates:/,/Affiliations:/ { if ($1~/testUser$/) print $9}' ;;
   esac

   # allow certificate for testUser to expire
   sleep 50
   # at starttime+60 seconds, enroll testUser2, revoke testUser2
   while test $(date "+%S") -gt 3; do sleep .5; done

   # refresh $ADMINUSER cert
   enroll
   openssl x509 -in $ADMINCERT -noout -startdate -enddate; date
   enroll testUser2 user2
   fabric-ca-client revoke -e testUser2 -H $CA_CFG_PATH/$ADMINUSER
   openssl x509 -in $USERCERT2 -noout -startdate -enddate; date
   s2=$(openssl x509 -noout -in $CA_CFG_PATH/testUser2/msp/signcerts/cert.pem -serial | awk -F'=' '{print $2}')
   printf "testUser2 Revoke date ==========> "
   case  $db in
      postgres) $SCRIPTDIR/fabric-ca_setup.sh -d postgres -D -L | awk '$1=="testUser" {print $17}' ;;
      sqlite3)  $SCRIPTDIR/fabric-ca_setup.sh -L -x /tmp/gencrl -D  | awk -F'|' '$1~/testUser$/ {print $8}' ;;
      mysql)    $SCRIPTDIR/fabric-ca_setup.sh -L -D -d mysql 2>&1|awk '/Certificates:/,/Affiliations:/ { if ($1~/testUser$/) print $9}' ;;
   esac

   # intersection of expiry window (A), and revoke window (B)
   #     B1  B2  B3  B4  B5
   #A1   0   0   0   0   0
   #A2   0   1   1   0   0
   #A3   0   1  1,2  2   0
   #A4   0   0   2   2   0
   #A5   0   0   0   0   0
   #
   checkCrl $a1 $b1 $a1 $b1 ""
   checkCrl $a1 $b1 $a2 $b2 ""
   checkCrl $a1 $b1 $a3 $b3 ""
   checkCrl $a1 $b1 $a4 $b4 ""
   checkCrl $a1 $b1 $a5 $b5 ""

   checkCrl $a2 $b2 $a1 $b1 ""
   checkCrl $a2 $b2 $a2 $b2 "$s1"
   checkCrl $a2 $b2 $a3 $b3 "$s1"
   checkCrl $a2 $b2 $a4 $b4 ""
   checkCrl $a2 $b2 $a5 $b5 ""

   checkCrl $a3 $b3 $a1 $b1 ""
   checkCrl $a3 $b3 $a2 $b2 "$s1"
   checkCrl $a3 $b3 $a3 $b3 "$s1" "$s2"
   checkCrl $a3 $b3 $a4 $b4 "$s2"
   checkCrl $a3 $b3 $a5 $b5 ""

   checkCrl $a4 $b4 $a1 $b1 ""
   checkCrl $a4 $b4 $a2 $b2 ""
   checkCrl $a4 $b4 $a3 $b3 "$s2"
   checkCrl $a4 $b4 $a4 $b4 "$s2"
   checkCrl $a4 $b4 $a5 $b5 ""

   checkCrl $a5 $b5 $a1 $b1 ""
   checkCrl $a5 $b5 $a2 $b2 ""
   checkCrl $a5 $b5 $a3 $b3 ""
   checkCrl $a5 $b5 $a4 $b4 ""
   checkCrl $a5 $b5 $a5 $b5 ""

   # Lastly, ensure that we don't allow an unauthorized user to issue gencrl
   enroll $NOTADMINUSER pass
   fabric-ca-client gencrl -H $CA_CFG_PATH/$NOTADMINUSER && ErrorMsg "Access to gencrl by ($NOTADMINUSER) should have failed"
done

CleanUp $RC
exit $RC
