# Copyright the Hyperledger Fabric contributors. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
@single-org @commercial-paper
Feature: CommercialPaper

    Scenario: I can install and instantiate the commercial paper chaincode
        Given Channel "commercialpaperchannel" has been created using the profile "channel"
        And All peers on channel "commercialpaperchannel" have installed the chaincode "commercialpaper"
        And Organisation "Org1" has registered the identity "magnetocorp"
        And Organisation "Org1" has registered the identity "digibank"
        And Organisation "Org1" has registered the identity "hedgematic"
        And Organisation "Org1" has instantiated the chaincode "commercialpaper" on channel "commercialpaperchannel"

    Scenario: I can create a new commercial paper
        When Organisation "Org1" submits against the chaincode "commercialpaper" the transaction "issue" on channel "commercialpaperchannel" as "magnetocorp" with args:
            | magnetocorp | 0001 | 2020-01-13 14:46 | 2021-01-13 14:46 | 100000 |
        Then The world state for the chaincode "commercialpaper" on channel "commercialpaperchannel" should contain '{"class":"org.papernet.commercialpaper","currentState":1,"faceValue":100000,"issueDateTime":"2020-01-13 14:46","issuer":"magnetocorp","key":"magnetocorp:0001","maturityDateTime":"2021-01-13 14:46","owner":"magnetocorp","paperNumber":"0001"}' for composite key composed of:
            | org.papernet.commercialpaperlist | magnetocorp | 0001 |

    Scenario: I cannot buy a commercial paper when not the current owner
        Then Expecting an error organisation "Org1" submits against the chaincode "commercialpaper" the transaction "buy" on channel "commercialpaperchannel" as "magnetocorp" with args:
            | magnetocorp | 0001 | digibank | digibank | 900 | 2020-01-14 10:26 |

    Scenario: I can buy an issued commercial paper
        When Organisation "Org1" submits against the chaincode "commercialpaper" the transaction "buy" on channel "commercialpaperchannel" as "magnetocorp" with args:
            | magnetocorp | 0001 | magnetocorp | digibank | 900 | 2020-01-14 10:26 |
        Then The world state for the chaincode "commercialpaper" on channel "commercialpaperchannel" should contain '{"class":"org.papernet.commercialpaper","currentState":2,"faceValue":100000,"issueDateTime":"2020-01-13 14:46","issuer":"magnetocorp","key":"magnetocorp:0001","maturityDateTime":"2021-01-13 14:46","owner":"digibank","paperNumber":"0001"}' for composite key composed of:
            | org.papernet.commercialpaperlist | magnetocorp | 0001 |

    Scenario: I can buy a previously bought commercial paper
        When Organisation "Org1" submits against the chaincode "commercialpaper" the transaction "buy" on channel "commercialpaperchannel" as "digibank" with args:
            | magnetocorp | 0001 | digibank | hedgematic | 950 | 2020-01-14 10:26 |
        Then The world state for the chaincode "commercialpaper" on channel "commercialpaperchannel" should contain '{"class":"org.papernet.commercialpaper","currentState":2,"faceValue":100000,"issueDateTime":"2020-01-13 14:46","issuer":"magnetocorp","key":"magnetocorp:0001","maturityDateTime":"2021-01-13 14:46","owner":"hedgematic","paperNumber":"0001"}' for composite key composed of:
            | org.papernet.commercialpaperlist | magnetocorp | 0001 |

    Scenario: I cannot redeem a commercial paper when not the current owner
        Then Expecting an error organisation "Org1" submits against the chaincode "commercialpaper" the transaction "redeem" on channel "commercialpaperchannel" as "magnetocorp" with args:
            | magnetocorp | 0001 | digibank | 2021-01-14 14:47 |

    Scenario: I can redeem a commercial paper
        When Organisation "Org1" submits against the chaincode "commercialpaper" the transaction "redeem" on channel "commercialpaperchannel" as "hedgematic" with args:
            | magnetocorp | 0001 | hedgematic | 2021-01-14 14:47 |
        Then The world state for the chaincode "commercialpaper" on channel "commercialpaperchannel" should contain '{"class":"org.papernet.commercialpaper","currentState":3,"faceValue":100000,"issueDateTime":"2020-01-13 14:46","issuer":"magnetocorp","key":"magnetocorp:0001","maturityDateTime":"2021-01-13 14:46","owner":"magnetocorp","paperNumber":"0001"}' for composite key composed of:
            | org.papernet.commercialpaperlist | magnetocorp | 0001 |

    Scenario: I cannot buy a commercial paper when it has been redeemed
        Then Expecting an error organisation "Org1" submits against the chaincode "commercialpaper" the transaction "buy" on channel "commercialpaperchannel" as "magnetocorp" with args:
            | magnetocorp | 0001 | magnetocorp | digibank | 900 | 2020-01-14 10:26 |

    Scenario: I cannot redeem a commercial paper when it has been redeemed
        Then Expecting an error organisation "Org1" submits against the chaincode "commercialpaper" the transaction "redeem" on channel "commercialpaperchannel" as "magnetocorp" with args:
            | magnetocorp | 0001 | magnetocorp | 2021-01-14 14:47 |