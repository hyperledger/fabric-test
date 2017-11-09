// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0
//

package main        // Orderer Test Engine

import (
        "testing"
        "fmt"
        "time"
        "strconv"
)

const (
        launchDelaySecs = 20     // minimum typical time to launch Network and Producers
        secsPerMinute =   60     // other timelengths in seconds
        secsPer10Min =   600
        secsPerHour =   3600
        secsPer12Hr =  43200
        secsPerDay =   86400
)

// Helper function useful when using spyDefer
// Start a go thread to delay and startMasterSpy, and returns immediately
func spyOnOrdererAfterSecs(ord int, trafficDelayTime uint64) {
        // Remember it takes a minimum of about 20 secs to set up and launch the network and Producers.
        // Let's wait that 20 plus whatever time the test wants to run traffic before we start the spy consumer.
        masterSpyReadyWG.Add(1)
        go func(ordNum int, delayTime uint64) {
                time.Sleep( time.Duration(trafficDelayTime + launchDelaySecs) * time.Second )
                fmt.Println("===== Test calling startMasterSpy on orderer ", ordNum, " at ", time.Now())
                startMasterSpy(ordNum)
        }(ord, trafficDelayTime)
}

func pauseAndUnpause(target string) {
        time.Sleep(100 * time.Second)
        fmt.Println("Pausing  "+target+" at ", time.Now())
        executeCmd("docker pause " + target + " && sleep 60 && docker unpause " + target + " ")
        fmt.Println("Unpaused "+target+" at ", time.Now())
}

func stopAndStart(target string) {
        time.Sleep(90 * time.Second)
        fmt.Println("Stopping "+target+" at ", time.Now())
        executeCmd("docker stop " + target + " && sleep 30 && docker start " + target)
        fmt.Println("Started  "+target+" at ", time.Now())
}

func stopAndStartAllTargetOneAtATime(target string, num int) {
        fmt.Println("Stop and Start ", num, " " + target + "s sequentially")
        for i := 0 ; i < num ; i++ {
                stopAndStart(target + strconv.Itoa(i))
        }
        // A restart (below) is similar, but lacks delays in between
        // executeCmd("docker restart kafka0 kafka1 kafka2")
        fmt.Println("All ", num, " requested " + target + "s are stopped and started")
}

func pauseAndUnpauseAllTargetOneAtATime(target string, num int) {
        fmt.Println("Pause and Unpause ", num, " " + target + "s sequentially")
        //c := ".example.com";
        for i := 0 ; i < num ; i++ {
                //pauseAndUnpause(target + strconv.Itoa(i) + string(c))
                pauseAndUnpause(target + strconv.Itoa(i))
        }
        fmt.Println("All ", num, " requested " + target + "s are paused and unpaused")
}


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// Insert "_CI" into the names of all go tests to use for Continuous Improvement Acceptance Testing


// simplest testcase for Solo
func Test_11tx_1ch_1ord_Solo_Basic_CI(t *testing.T) {
        fmt.Println("\nBasic Solo test: Send 11 TX on 1 channel to 1 Solo orderer-type")
        passResult, finalResultSummaryString := ote("Test_11tx_1ch_1ord_Solo", 11, 1, 1, "solo", 0, spyOff, 1 )
        t.Log(finalResultSummaryString)
        if !passResult { t.Fail() }
}

// simplest testcase for Kafka
func Test_11tx_1ch_1ord_kafka_3kb_Basic_CI(t *testing.T) {
        fmt.Println("\nBasic Kafka test: Send 11 TX on 1 channel to 1 Kafka orderer-type with 3 Kafka-Brokers and ZooKeeper")
        passResult, finalResultSummaryString := ote("Test_11tx_1ch_1ord_kafka_3kb", 11, 1, 1, "kafka", 3, spyOff, 1 )
        t.Log(finalResultSummaryString)
        if !passResult { t.Fail() }
}


// 76 - moved below

// 77, 78 = rerun with batchsize = 500 // CONFIGTX_ORDERER_BATCHSIZE_MAXMESSAGECOUNT=500
func Test_ORD77_ORD78_10000TX_1ch_1ord_solo_batchSz(t *testing.T) {
        //fmt.Println("Send 10,000 TX on 1 channel to 1 Solo orderer")
        passResult, finalResultSummaryString := ote("ORD-77_ORD-78", 150, 1, 1, "solo", 0, spyOff, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 79, 80 = rerun with batchsize = 500
func Test_ORD79_ORD80_10000TX_1ch_1ord_kafka_1kbs_batchSz(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-79,ORD-80", 100, 1, 3, "kafka", 4, spyOn, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 81, 82 = rerun with batchsize = 500
// this one is a first good attempt at multiple channels
func Test_multchans_ORD81_ORD82_10000TX_3ch_1ord_kafka_3kbs_batchSz_CI(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-81,ORD-82", 10000, 3, 3, "kafka", 4, spyOff, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// this one is not in the testplan, but is a first good attempt at multiple orderers
func Test_multords_10000TX_1ch_3ord_kafka_3kbs_batchSz_CI(t *testing.T) {
        passResult, finalResultSummaryString := ote("multords", 100, 1, 3, "kafka", 3, spyOff, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// first test with spyDefer
/*func Test_multords_spydefer_1ch_3ord_kafka_3kbs_batchSz(t *testing.T) {
        // Note: Sending 20K msgs on one channel, split among 3 orderers, takes about 55 secs on x86 laptop.
        spyOnOrdererAfterSecs(1, 30)  // returns immediately after starting a go thread which waits (launchDelaySecs + 30) seconds and then starts MasterSpy
        passResult, finalResultSummaryString := ote("multords_spydefer", 20000, 1, 3, "kafka", 3, spyDefer, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}*/

// 83, 84 = rerun with batchsize = 500
// this one is a first good attempt at multiple channels AND multiple orderers
func Test_ORD83_ORD84_10000TX_3ch_3ord_kafka_3kbs_batchSz_CI(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-83,ORD-84", 10000, 3, 3, "kafka", 3, spyOff, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 85
func Test_ORD85_100000TX_1ch_3ord_kafka_3kbs_spy(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-85", 100000, 1, 3, "kafka", 4, spyOn, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 86
func Test_ORD86_1000000TX_3ch_1ord_kafka_3kbs_spy(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-86", 100000, 3, 1, "kafka", 4, spyOff, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 87
func Test_ORD87_1000000TX_3ch_3ord_kafka_3kbs_spy(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-87", 100000, 3, 3, "kafka", 3, spyOff, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

////////////////////////////////////////////////////////////////////////////////
// The "multiple producers" functionality option is not yet supported, so skip these tests.
//
//  // 88
//  func Test_ORD88_1000000TX_1ch_1ord_kafka_3kbs_spy_3ppc(t *testing.T) {
//          passResult, finalResultSummaryString := ote("ORD-88", 1000000, 1, 1, "kafka", 3, spyOn, 3 )
//          if !passResult { t.Error(finalResultSummaryString) }
//  }
//
//  // 89
//  func Test_ORD89_1000000TX_3ch_3ord_kafka_3kbs_spy_3ppc(t *testing.T) {
//          passResult, finalResultSummaryString := ote("ORD-89", 1000000, 3, 3, "kafka", 3, spyOn, 3 )
//          if !passResult { t.Error(finalResultSummaryString) }
//  }
////////////////////////////////////////////////////////////////////////////////

// 90
func Test_ORD90_1000000TX_100ch_1ord_kafka_3kbs_spy(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-90", 100000, 100, 1, "kafka", 4, spyOn, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 91
func Test_ORD91_1000000TX_100ch_3ord_kafka_3kbs_spy(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-91", 100000, 100, 3, "kafka", 4, spyOff, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 76
func Test_ORD76_40000TX_1ch_1ord_kafka_3kbs(t *testing.T) {
        go stopAndStart("kafka0")
        passResult, finalResultSummaryString := ote("ORD-76", 40000, 1, 1, "kafka", 3, spyOff, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 92 and 93 - orderer tests, moved below

//94 - stopAndStartAll KafkaBrokers OneAtATime
func Test_ORD94_500000TX_1ch_3ord_kafka_3kbs(t *testing.T) {
        go stopAndStartAllTargetOneAtATime("kafka", 4)
        spyOnOrdererAfterSecs(1, 450)
        passResult, finalResultSummaryString := ote("ORD-94", 350000, 1, 3, "kafka", 4, spyDefer, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//95 - pauseAndUnpauseAll KafkaBrokers OneAtATime
func Test_ORD95_500000TX_1ch_3ord_kafka_4kbs(t *testing.T) {
        go pauseAndUnpauseAllTargetOneAtATime("kafka", 4)
        spyOnOrdererAfterSecs(1, 500)
        passResult, finalResultSummaryString := ote("ORD-95", 500000, 1, 3, "kafka", 4, spyDefer, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//96 - stopping K-1 KBs
func Test_ORD96_100000TX_1ch_3ord_kafka_3kbs(t *testing.T) {
        go kafka3kbRestart2kbDelay("stop")
        passResult, finalResultSummaryString := ote("ORD-96", 50000, 1, 2, "kafka", 3, spyOff, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}
func kafka3kbRestart2kbDelay(pauseOrStop string) {
        time.Sleep(140 * time.Second)
        fmt.Println(pauseOrStop + " K-1 of the Kafka brokers, 0 1,", time.Now())
        if pauseOrStop == "pause" {
                executeCmd("docker pause kafka0 && sleep 20 && docker pause kafka1 && sleep 20  && docker unpause kafka0 && sleep 20 && docker unpause kafka1")
                //executeCmd("docker pause kafka0 && sleep 20 && docker pause kafka1 && sleep 30  && docker unpause kafka0 && sleep 20 && docker unpause kafka1")
        } else {
                executeCmd("docker stop kafka0 && sleep 20 && docker stop kafka1 && sleep 20  && docker start kafka0 && sleep 20 && docker start kafka1 && sleep 60 && docker stop kafka0 && sleep 20 && docker stop kafka1 && sleep 20 && docker start kafka1 && sleep 20 && docker start kafka0")
        }
        fmt.Println("kafka brokers are restarted 0 1,", time.Now())
}

//97 - stopping all the kafka brokers at once
func Test_ORD97_100000TX_1ch_3ord_kafka_3kbs(t *testing.T) {
        // Note: Sending 20K msgs on one channel, split among 3 orderers, takes about 55 secs on x86 laptop.
        go kafka3kbRestart3kb("stop")
        spyOnOrdererAfterSecs(1, 300)
        passResult, finalResultSummaryString := ote("ORD-97", 500000, 1, 3, "kafka", 4, spyDefer, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}
func kafka3kbRestart3kb(pauseOrStop string) {
        time.Sleep(120 * time.Second)
        fmt.Println(pauseOrStop + " all the Kafka brokers, 0 1 2 3,", time.Now())
        cmdStr := ""
        if pauseOrStop == "pause" {
                cmdStr = "docker pause kafka0 kafka1 kafka2 kafka3 && sleep 15 && docker unpause kafka3 kafka2 kafka1 kafka0"
                executeCmd(cmdStr)
                //cmdStr = "docker pause kafka0 kafka1 kafka2 && sleep 70 && docker unpause kafka0 kafka1 kafka2"
        } else {
                // The orderer service never resumes when we restart kafka-brokers these ways (FAB-2575):
                // AND in scenario 0/1 (FAB-2582) http2Client errors occur after restart brokers, with sometimes LOST transactions and the orderers are not consistent.
                // AND in scenario 0? (FAB-2604) some transactions are duplicated when sending 500,000 (not when 300,000)
                // 0- cmdStr = "docker stop kafka0 kafka1 kafka2 && sleep 20 && docker start kafka2 kafka1 kafka0"
                // 1- cmdStr = "docker stop kafka0 kafka1 kafka2 && sleep 20 && docker start kafka0 kafka1 kafka2"
                // 2- cmdStr = "docker stop kafka0 && sleep 20 && docker stop kafka1 && sleep 20 && docker stop kafka2 && sleep 20 && docker start kafka0 && sleep 20 && docker start kafka1 && sleep 20 && docker start kafka2"
                // 3-
 //cmdStr = "docker stop kafka0 kafka1 kafka2 kafka3 && sleep 20 && docker start kafka3 kafka2 kafka1 kafka0"
 //cmdStr = "docker stop kafka0 && sleep 10 && docker start kafka0 && sleep 10 && docker stop kafka1 && sleep 10 && docker start kafka1 && sleep 10 && docker stop kafka2 && sleep 10 && docker start kafka2 && sleep 10 && docker stop kafka3 && sleep 10 && docker start kafka3"
		cmdStr = "docker stop kafka0 && sleep 20 && docker stop kafka1 && sleep 20 && docker restart kafka2 && sleep 20 && docker start kafka1 && sleep 20 && docker start kafka0"
                fmt.Println(cmdStr)
                executeCmd(cmdStr)
        }
        fmt.Println("All the kafka brokers are restarted,", time.Now())
}

//98 - pausing K-1 KBs
func Test_ORD98_50000TX_1ch_3ord_kafka_4kbs(t *testing.T) {
        go kafka3kbRestart2kbDelay("pause")
        //spyOnOrdererAfterSecs(1, 140)
        passResult, finalResultSummaryString := ote("ORD-98", 50000, 1, 3, "kafka", 4, spyOff, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//99 pausing all the kafka brokers at once
func Test_ORD99_50000TX_1ch_3ord_kafka_4kbs(t *testing.T) {
        go kafka3kbRestart3kb("pause")
        spyOnOrdererAfterSecs(1, 160)
        passResult, finalResultSummaryString := ote("ORD-99", 50000, 1, 3, "kafka", 4, spyDefer, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// For tests 92 and 93:
// As code works now, traffic will be dropped when orderer stops, so
// the number of transactions and blocks DELIVERED to consumers watching that
// orderer will be lower. So the OTE testcase will fail - BUT
// we could manually verify the ACK'd TXs match the delivered.

func Test_ORD92_50000TX_1ch_3ord_kafka_3kbs(t *testing.T) {
        go stopAndStart("orderer1.example.com") // sleep 40 && docker stop orderer1 && sleep 30 && docker start orderer1
        spyOnOrdererAfterSecs(1, 160)  // returns immediately after starting a go thread which waits (20=launchDelaySecs + 120) seconds and then starts MasterSpy on orderer1
        passResult, finalResultSummaryString := ote("ORD-92", 50000, 1, 3, "kafka", 4, spyDefer, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//93 pause an orderer
func Test_ORD93_50000TX_1ch_3ord_kafka_3kbs(t *testing.T) {
        go pauseAndUnpause("orderer1.example.com")
        spyOnOrdererAfterSecs(1, 160)  // returns immediately after starting a go thread which waits (20=launchDelaySecs + 120) seconds and then starts MasterSpy on orderer1
        passResult, finalResultSummaryString := ote("ORD-93", 50000, 1, 3, "kafka", 4, spyDefer, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}
//104 Pausing all the orderers
func Test_ORD104_50000TX_1ch_3ord_kafka_3kbs(t *testing.T) {
        go pauseAndUnpauseAllTargetOneAtATime("orderer", 3)
        spyOnOrdererAfterSecs(1, 400)  // returns immediately after starting a go thread which waits (20=launchDelaySecs + 120) seconds and then starts MasterSpy on orderer1
        passResult, finalResultSummaryString := ote("ORD-104", 250000, 1, 3, "kafka", 4, spyDefer, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//95 - pauseAndUnpauseAll KafkaBrokers OneAtATime
func Test_ORD105_500000TX_1ch_3ord_kafka_4kbs(t *testing.T) {
        go pauseAndUnpauseAllTargetOneAtATime("kafka", 4)
        spyOnOrdererAfterSecs(1, 650)
        passResult, finalResultSummaryString := ote("ORD-105", 500000, 1, 3, "kafka", 4, spyDefer, 1 )
        if !passResult { t.Error(finalResultSummaryString) }
}
