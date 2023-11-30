#!/bin/bash

VER=1.0
SEQ=1

set -ex 

# org 2 -> 구성

NET_DIR=${IBANG_HOME}/my-network
export FABRIC_CFG_PATH=${NET_DIR}

export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=${NET_DIR}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export PEER0_ORG1_CA=${NET_DIR}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export PEER0_ORG2_CA=${NET_DIR}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

# 환경변수 설정함수
setEnv() {
    ORG=$1
    if [ $ORG -eq 1 ]; then 
        export CORE_PEER_LOCALMSPID="Org1MSP"
        export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
        export CORE_PEER_MSPCONFIGPATH=${NET_DIR}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
        export CORE_PEER_ADDRESS=localhost:7051
    else
        export CORE_PEER_LOCALMSPID="Org2MSP"
        export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG2_CA
        export CORE_PEER_MSPCONFIGPATH=${NET_DIR}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
        export CORE_PEER_ADDRESS=localhost:9051
    fi 
}

# package 명령
peer lifecycle chaincode package asset.tar.gz --path /home/bstudent/dev/chaincode/shadow/v1.1 --lang golang --label asset_$VER

# org1 설치 명령
setEnv 1
peer lifecycle chaincode install asset.tar.gz

# org2 설치 명령
setEnv 2
peer lifecycle chaincode install asset.tar.gz

peer lifecycle chaincode queryinstalled > qresult.txt
PACKAGE_ID=$(sed -n "/asset_$VER/{s/^Package ID: //; s/, Label:.*$//; p;}" qresult.txt)

# org1 승인 명령
setEnv 1
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA --channelID mychannel --name asset --version $VER --package-id $PACKAGE_ID --sequence $SEQ

sleep 3

# org2 승인 명령
setEnv 2
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA --channelID mychannel --name asset --version $VER --package-id $PACKAGE_ID --sequence $SEQ

sleep 3

# 배포 명령
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA --channelID mychannel --name asset --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA --version $VER --sequence $SEQ

sleep 3

# TEST - TRANSFER
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA  --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA -C mychannel -n asset -c '{"Args":["TransferAsset", "asset11", "Fall"]}'

sleep 3

# TEST - GETALLASSET
peer chaincode query -C mychannel -n asset -c '{"Args":["GetAllAssets"]}'
