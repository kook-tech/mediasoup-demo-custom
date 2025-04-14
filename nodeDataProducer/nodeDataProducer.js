import * as protooClient from 'protoo-client';
import { createWorker } from 'mediasoup-client-aiortc';
import * as mediasoupClient from 'mediasoup-client';
import wsPkg from 'websocket';

const { w3cwebsocket } = wsPkg;

const origin = 'https://robotics.onionsoftware.com:3000';
const roomId = 'dev';
const peerId = 'DataBot';
const protooUrl = `wss://robotics.onionsoftware.com:4443/ws?roomId=${roomId}&peerId=${peerId}`;

console.log(`test ${protooUrl instanceof Array}`);

// websocket 모듈의 w3cwebsocket에 origin 전달
const ws = new w3cwebsocket(protooUrl, "protoo", origin);


const worker = await createWorker({ logLevel: 'warn' });

const device = new mediasoupClient.Device({
        handlerFactory: worker.createHandlerFactory()
    });

// WebSocketTransport 및 Peer 생성
const transport = new protooClient.WebSocketTransport(protooUrl, {
    origin: 'https://robotics.onionsoftware.com:3000'
    });
const protoo = new protooClient.Peer(transport);

  // 연결 완료 후 실행
protoo.on('open', async () => {
    try {
        console.log('✅ Protoo connected');

        const routerRtpCapabilities = await protoo.request('getRouterRtpCapabilities');
        await device.load({ routerRtpCapabilities });

        await protoo.request('join', {
        displayName: 'DataBot',
        device: {
            flag: 'bot',
            name: 'node-client',
            version: '1.0.0'
        },
        rtpCapabilities: {}, // 데이터 전송 전용
        sctpCapabilities: device.sctpCapabilities
        });

        console.log('✅ Join 성공');
        // 3. WebRTC 전송용 Transport 요청
        const {
        id,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        sctpParameters
        } = await protoo.request('createWebRtcTransport', {
        forceTcp: false,
        producing: true,
        consuming: false,
        sctpCapabilities: device.sctpCapabilities
        });

        // 4. 전송 Transport 생성
        const sendTransport = device.createSendTransport({
        id,
        iceParameters,
        iceCandidates,
        dtlsParameters,
        sctpParameters,
        iceServers: []
        });

        sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                await protoo.request('connectWebRtcTransport', {
                transportId: sendTransport.id,
                dtlsParameters
                });
                callback();
            } catch (error) {
                    errback(error);
            }
        });

        sendTransport.on('producedata', async ({ sctpStreamParameters, label, protocol, appData }, callback, errback) => {
            try {
                const { id } = await protoo.request('produceData', {
                transportId: sendTransport.id,
                sctpStreamParameters,
                label,
                protocol,
                appData
            });
                callback({ id });
            } catch (error) {
                errback(error);
            }
        });

        // 5. DataChannel 생성 및 송신
        const dataProducer = await sendTransport.produceData({
            ordered: true,
            label: 'chat',
            priority: 'medium'
        });

        dataProducer.on('open', () => {
            console.log('✅ DataChannel open');
            setInterval(() => {
                //const message = JSON.stringify({ timestamp: Date.now(), message: ' 실시간 데이터 처리' });
                // dataProducer.send(message);
                dataProducer.send("test message");
                console.log('데이터 전송:', "test message");
            }, 1000);
        });

        dataProducer.on('error', (err) => {
            console.error('❌ DataProducer error:', err);
        });

    } catch (err) {
            console.error('❌ Setup error:', err);
    }
});

protoo.on('failed', () => {
    console.error('❌ Protoo connection failed');
});

protoo.on('disconnected', () => {
    console.warn('⚠️ Protoo disconnected');
});






				// // // Data-only bot이라면 UI에 표시 안 함
				// console.log(`displayName = ${peer.displayName}`);
  				// if (peer.displayName === 'DataBot') {
				// 	console.log("걸리긴 했음");
				// 	continue;
				// }

                return (
                    <div data-component="Peers">
                        {peers.map(peer => {
                            //UI display interrupt
                            if (peer.displayName === 'DataBot') return null;