import * as protooClient from 'protoo-client';
import { createWorker } from 'mediasoup-client-aiortc';
import * as mediasoupClient from 'mediasoup-client';
//for origin
import wsPkg from 'websocket';


//console.log(JSON.stringify(requestUrl, null, 2));
const { w3cwebsocket } = wsPkg;

const origin = 'https://robotics.onionsoftware.com:3000';

const roomId = 'dev';
const peerId = 'test';
const protooUrl = `wss://robotics.onionsoftware.com:4443/ws?roomId=${roomId}&peerId=${peerId}`;

console.log(`test ${protooUrl instanceof Array}`);

// websocket 모듈의 w3cwebsocket에 origin 전달
const ws = new w3cwebsocket(protooUrl, "protoo", origin);

// protoo에 전달
const transport = new protooClient.WebSocketTransport(protooUrl, {
    origin: 'https://robotics.onionsoftware.com:3000'
  });
const protoo = new protooClient.Peer(transport);

const worker = await createWorker({ logLevel: 'warn' });


protoo.on('open', async () => {
    
  try {
    console.log('✅ Protoo connected');

    const device = new mediasoupClient.Device({
      handlerFactory: worker.createHandlerFactory()
    });

    const routerRtpCapabilities = await protoo.request('getRouterRtpCapabilities');
    await device.load({ routerRtpCapabilities });

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
        console.log("connect");
        await protoo.request('connectWebRtcTransport', {
          transportId: sendTransport.id,
          dtlsParameters
        });
        callback();
      } catch (err) {
        errback(err);
      }
    });

    sendTransport.on('producedata', async ({ sctpStreamParameters, label, protocol, appData }, callback, errback) => {
      try {
        console.log("producedata");
        const { id } = await protoo.request('produceData', {
          transportId: sendTransport.id,
          sctpStreamParameters,
          label,
          protocol,
          appData
        });
        callback({ id });
      } catch (err) {
        errback(err);
      }
    });

    const dataProducer = await sendTransport.produceData({
      ordered: true,
      label: 'chat',
      priority: 'medium'
    });

    dataProducer.on('open', () => {
        
      console.log('✅ DataChannel open');
      setInterval(() => {
        dataProducer.send('🔥 실시간 메시지');
      }, 1000);
    });

  } catch (err) {
    console.error('❌ Error during setup:', err);
  }
});

protoo.on('failed', () => {
  console.error('❌ Protoo connection failed');
});
protoo.request('closeProducer',{});
protoo.on('disconnected', () => {
  console.warn('⚠️ Protoo disconnected');
});


protoo.on('close', () => {
    console.warn('⚠️ Protoo closed');
    // protoo.close();
    // this._closed = true;
    // this.safeEmit('close');
    // this._ws.onopen = null;
    // this._ws.onclose = null;
    // this._ws.onerror = null;
    // this._ws.onmessage = null;
    // this._ws.close();
    // this._ws = null;
    // this._closed = true; 
    if (this._closed) return;

    this.close();
});