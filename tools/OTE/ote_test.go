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
        passResult, finalResultSummaryString := ote("Test_11tx_1ch_1ord_Solo", 11, 1, 1, "solo", 0, spyOff, 1, 0 )
        t.Log(finalResultSummaryString)
        if !passResult { t.Fail() }
}

// simplest testcase for Kafka
func Test_11tx_1ch_1ord_kafka_3kb_Basic_CI(t *testing.T) {
        fmt.Println("\nBasic Kafka test: Send 11 TX on 1 channel to 1 Kafka orderer-type with 3 Kafka-Brokers and ZooKeeper")
        passResult, finalResultSummaryString := ote("Test_11tx_1ch_1ord_kafka_3kb", 11, 1, 1, "kafka", 3, spyOff, 1, 0 )
        t.Log(finalResultSummaryString)
        if !passResult { t.Fail() }
}


// 76 - moved below

// 77, 78 = rerun with batchsize = 500 // CONFIGTX_ORDERER_BATCHSIZE_MAXMESSAGECOUNT=500
func Test_ORD77_ORD78_1ch_1ord_solo_batchSz(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-77_ORD-78", 10000, 1, 1, "solo", 0, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 79, 80 = rerun with batchsize = 500
func Test_ORD79_ORD80_1ch_1ord_kafka_1kbs_batchSz(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-79,ORD-80", 10000, 1, 3, "kafka", 4, spyOn, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 81, 82 = rerun with batchsize = 500
// this one is a first good attempt at multiple channels
func Test_multchans_ORD81_ORD82_3ch_1ord_kafka_3kbs_batchSz_CI(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-81,ORD-82", 10000, 3, 3, "kafka", 4, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// this one is not in the testplan, but is a first good attempt at multiple orderers
func Test_multords_1ch_3ord_kafka_3kbs_batchSz_CI(t *testing.T) {
        passResult, finalResultSummaryString := ote("multords", 100, 1, 3, "kafka", 3, spyOff, 1, 0 )
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
func Test_ORD83_ORD84_3ch_3ord_kafka_3kbs_batchSz_CI(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-83,ORD-84", 10000, 3, 3, "kafka", 3, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 85
func Test_ORD85_1ch_3ord_kafka_3kbs_spy(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-85", 100000, 1, 3, "kafka", 4, spyOn, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 86
func Test_ORD86_3ch_1ord_kafka_3kbs_spy(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-86", 100000, 3, 1, "kafka", 4, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 87
func Test_ORD87_3ch_3ord_kafka_3kbs_spy(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-87", 100000, 3, 3, "kafka", 3, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

////////////////////////////////////////////////////////////////////////////////
// The "multiple producers" functionality option is not yet supported, so skip these tests.
//
//  // 88
//  func Test_ORD88_1ch_1ord_kafka_3kbs_spy_3ppc(t *testing.T) {
//          passResult, finalResultSummaryString := ote("ORD-88", 1000000, 1, 1, "kafka", 3, spyOn, 3 )
//          if !passResult { t.Error(finalResultSummaryString) }
//  }
//
//  // 89
//  func Test_ORD89_3ch_3ord_kafka_3kbs_spy_3ppc(t *testing.T) {
//          passResult, finalResultSummaryString := ote("ORD-89", 1000000, 3, 3, "kafka", 3, spyOn, 3 )
//          if !passResult { t.Error(finalResultSummaryString) }
//  }
////////////////////////////////////////////////////////////////////////////////

// 90
func Test_ORD90_100ch_1ord_kafka_3kbs_spy(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-90", 100000, 100, 1, "kafka", 4, spyOn, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 91
func Test_ORD91_100ch_3ord_kafka_3kbs_spy(t *testing.T) {
        passResult, finalResultSummaryString := ote("ORD-91", 100000, 100, 3, "kafka", 4, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 76
func Test_ORD76_1ch_1ord_kafka_3kbs(t *testing.T) {
        go stopAndStart("kafka0")
        passResult, finalResultSummaryString := ote("ORD-76", 40000, 1, 1, "kafka", 3, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// 92 and 93 - orderer tests, moved below

//94 - stopAndStartAll KafkaBrokers OneAtATime
func Test_ORD94_1ch_3ord_kafka_3kbs(t *testing.T) {
        go stopAndStartAllTargetOneAtATime("kafka", 4)
        spyOnOrdererAfterSecs(1, 450)
        passResult, finalResultSummaryString := ote("ORD-94", 350000, 1, 3, "kafka", 4, spyDefer, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//95 - pauseAndUnpauseAll KafkaBrokers OneAtATime
func Test_ORD95_1ch_3ord_kafka_4kbs(t *testing.T) {
        go pauseAndUnpauseAllTargetOneAtATime("kafka", 4)
        spyOnOrdererAfterSecs(1, 500)
        passResult, finalResultSummaryString := ote("ORD-95", 500000, 1, 3, "kafka", 4, spyDefer, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//96 - stopping K-1 KBs
func Test_ORD96_1ch_3ord_kafka_3kbs(t *testing.T) {
        go kafka3kbRestart2kbDelay("stop")
        passResult, finalResultSummaryString := ote("ORD-96", 50000, 1, 2, "kafka", 3, spyOff, 1, 0 )
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
func Test_ORD97_1ch_3ord_kafka_3kbs(t *testing.T) {
        // Note: Sending 20K msgs on one channel, split among 3 orderers, takes about 55 secs on x86 laptop.
        go kafka3kbRestart3kb("stop")
        spyOnOrdererAfterSecs(1, 300)
        passResult, finalResultSummaryString := ote("ORD-97", 500000, 1, 3, "kafka", 4, spyDefer, 1, 0 )
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
func Test_ORD98_1ch_3ord_kafka_4kbs(t *testing.T) {
        go kafka3kbRestart2kbDelay("pause")
        //spyOnOrdererAfterSecs(1, 140)
        passResult, finalResultSummaryString := ote("ORD-98", 50000, 1, 3, "kafka", 4, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//99 pausing all the kafka brokers at once
func Test_ORD99_1ch_3ord_kafka_4kbs(t *testing.T) {
        go kafka3kbRestart3kb("pause")
        spyOnOrdererAfterSecs(1, 160)
        passResult, finalResultSummaryString := ote("ORD-99", 50000, 1, 3, "kafka", 4, spyDefer, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

// For tests 92 and 93:
// As code works now, traffic will be dropped when orderer stops, so
// the number of transactions and blocks DELIVERED to consumers watching that
// orderer will be lower. So the OTE testcase will fail - BUT
// we could manually verify the ACK'd TXs match the delivered.

func Test_ORD92_1ch_3ord_kafka_3kbs(t *testing.T) {
        go stopAndStart("orderer1.example.com") // sleep 40 && docker stop orderer1 && sleep 30 && docker start orderer1
        spyOnOrdererAfterSecs(1, 160)  // returns immediately after starting a go thread which waits (20=launchDelaySecs + 120) seconds and then starts MasterSpy on orderer1
        passResult, finalResultSummaryString := ote("ORD-92", 50000, 1, 3, "kafka", 4, spyDefer, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//93 pause an orderer
func Test_ORD93_1ch_3ord_kafka_3kbs(t *testing.T) {
        go pauseAndUnpause("orderer1.example.com")
        spyOnOrdererAfterSecs(1, 160)  // returns immediately after starting a go thread which waits (20=launchDelaySecs + 120) seconds and then starts MasterSpy on orderer1
        passResult, finalResultSummaryString := ote("ORD-93", 50000, 1, 3, "kafka", 4, spyDefer, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}
//104 Pausing all the orderers
func Test_ORD104_1ch_3ord_kafka_3kbs(t *testing.T) {
        go pauseAndUnpauseAllTargetOneAtATime("orderer", 3)
        spyOnOrdererAfterSecs(1, 400)  // returns immediately after starting a go thread which waits (20=launchDelaySecs + 120) seconds and then starts MasterSpy on orderer1
        passResult, finalResultSummaryString := ote("ORD-104", 250000, 1, 3, "kafka", 4, spyDefer, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//95 - pauseAndUnpauseAll KafkaBrokers OneAtATime
func Test_ORD105_1ch_3ord_kafka_4kbs(t *testing.T) {
        go pauseAndUnpauseAllTargetOneAtATime("kafka", 4)
        spyOnOrdererAfterSecs(1, 650)
        passResult, finalResultSummaryString := ote("ORD-105", 500000, 1, 3, "kafka", 4, spyDefer, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-6996 - send txns to solo orderer with default batchsize and default payload
func Test_FAB6996_1ch_1ord_solo(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-6996", 30000, 1, 1, "solo", 0, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7070 - send txns to solo orderer with default batchsize and higher payload
func Test_FAB7070_1ch_1ord_solo_10kpayload(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7070", 30000, 1, 1, "solo", 0, spyOff, 1, 10 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7024 - send txns to solo orderer with higher batchsize and default payload
func Test_FAB7024_1ch_1ord_solo_500batchsize(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7024", 30000, 1, 1, "solo", 0, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7071 - send txns to solo orderer with higher batchsize and higher payload
func Test_FAB7071_1ch_1ord_solo_500batchsize_10kpayload(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7071", 30000, 1, 1, "solo", 0, spyOff, 1, 10 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7026 - send txns to solo orderer on 3 channels with default batchsize and default payload
func Test_FAB7026_3ch_1ord_solo(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7026", 30000, 3, 1, "solo", 0, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7072 - send txns to solo orderer on 3 channels with default batchsize and higher payload
func Test_FAB7072_3ch_1ord_solo_10kpayload(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7072", 30000, 3, 1, "solo", 0, spyOff, 1, 10 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7027 - send txns to solo orderer on 3 channels with higher batchsize and default payload
func Test_FAB7027_3ch_1ord_solo_500batchsize(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7027", 30000, 3, 1, "solo", 0, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7073 - send txns to solo orderer on 3 channels with higher batchsize and higher payload
func Test_FAB7073_3ch_1ord_solo_500batchsize_10kpayload(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7073", 30000, 3, 1, "solo", 0, spyOff, 1, 10 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7036 - send txns to 3 orderers, 5 kafka brokers, 3 zookeepers with default batchsize and default payload
func Test_FAB7036_1ch_3ord_5kb(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7036", 30000, 1, 3, "kafka", 5, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7074 - send txns to 3 orderers, 5 kafka brokers, 3 zookeepers with default batchsize and higher payload
func Test_FAB7074_1ch_3ord_5kb_10kpayload(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7074", 15000, 1, 3, "kafka", 5, spyOff, 1, 10 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7037 - send txns to 3 orderers 5 kafka brokers, 3 zookeepers with higher batchsize and default payload
func Test_FAB7037_1ch_3ord_5kb_500batchsize(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7037", 30000, 1, 3, "kafka", 5, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7075 - send txns to 3 orderers 5 kafka brokers, 3 zookeepers with higher batchsize and higher payload
func Test_FAB7075_1ch_3ord_5kb_500batchsize_10kpayload(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7075", 15000, 1, 3, "kafka", 5, spyOff, 1, 10 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7038 - send txns to 3 orderers, 5 kafka brokers, 3 zookeepers with default batchsize and default payload
func Test_FAB7038_3ch_3ord_5kb(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7038", 30000, 3, 3, "kafka", 5, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7076 - send txns to 3 orderers, 5 kafka brokers, 3 zookeepers with default batchsize and higher payload
func Test_FAB7076_3ch_3ord_5kb_10kpayload(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7076", 15000, 3, 3, "kafka", 5, spyOff, 1, 10 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7039 - send txns to 3 orderers, 5 kafka brokers, 3 zookeepers with higher batchsize and default payload
func Test_FAB7039_3ch_3ord_5kb_500batchsize(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7039", 30000, 3, 3, "kafka", 5, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7077 - send txns to 3 orderers, 5 kafka brokers, 3 zookeepers with higher batchsize and higher payload
func Test_FAB7077_3ch_3ord_5kb_500batchsize_10kpayload(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7077", 15000, 3, 3, "kafka", 5, spyOff, 1, 10 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7058 - send txns to 6 orderers, 5 kafka brokers, 3 zookeepers with default batchsize and default payload
func Test_FAB7058_1ch_6ord_5kb(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7058", 30000, 1, 6, "kafka", 5, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7078 - send txns to 6 orderers, 5 kafka brokers, 3 zookeepers with default batchsize and higher payload
func Test_FAB7078_1ch_6ord_5kb_10kpayload(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7078", 15000, 1, 6, "kafka", 5, spyOff, 1, 10 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7059 - send txns to 6 orderers 5 kafka brokers, 3 zookeepers with higher batchsize and default payload
func Test_FAB7059_1ch_6ord_5kb_500batchsize(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7059", 30000, 1, 6, "kafka", 5, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7079 - send txns to 6 orderers 5 kafka brokers, 3 zookeepers with higher batchsize and higher payload
func Test_FAB7079_1ch_6ord_5kb_500batchsize_10kpayload(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7079", 15000, 1, 6, "kafka", 5, spyOff, 1, 10 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7060 - send txns to 6 orderers, 5 kafka brokers, 3 zookeepers with default batchsize and default payload
func Test_FAB7060_3ch_6ord_5kb(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7060", 30000, 3, 6, "kafka", 5, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7080 - send txns to 6 orderers, 5 kafka brokers, 3 zookeepers with default batchsize and higher payload
func Test_FAB7080_3ch_6ord_5kb_10kpayload(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7080", 15000, 3, 6, "kafka", 5, spyOff, 1, 10 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7061 - send txns to 6 orderers, 5 kafka brokers, 3 zookeepers with higher batchsize and default payload
func Test_FAB7061_3ch_6ord_5kb_500batchsize(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7061", 30000, 3, 6, "kafka", 5, spyOff, 1, 0 )
        if !passResult { t.Error(finalResultSummaryString) }
}

//FAB-7081 - send txns to 6 orderers, 5 kafka brokers, 3 zookeepers with higher batchsize and higher payload
func Test_FAB7081_3ch_6ord_5kb_500batchsize_10kpayload(t *testing.T) {
        passResult, finalResultSummaryString := ote("FAB-7081", 15000, 3, 6, "kafka", 5, spyOff, 1, 10 )
        if !passResult { t.Error(finalResultSummaryString) }
}
