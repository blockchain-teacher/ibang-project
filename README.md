# ibang-project

# Prereq.
ubuntu server 20.04 LTS
curl
golang 1.20 >=
nodejs v18 >=
docker 
docker-compose
jq

# network start
```
cd my-network
mkdir -p config organizations/fabric-ca
./startnetwork.sh
./createchannel.sh
```
* result 
docker ps -a
ls ../application/config # connection-org2.json 확인

# chaincode deploy
```
cd chaincode/exp
./deploy.sh
```

# application test
```
cd application
npm install
node server
```

http://localhost:3000 


