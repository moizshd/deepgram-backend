require('dotenv').config();
const express = require('express');
const { Server } = require('ws');
const { Deepgram } = require('@deepgram/sdk');

const app = express();
const PORT = process.env.PORT || 3001;
const deepgramApiKey = 'YOUR KEY';

const deepgram = new Deepgram(deepgramApiKey);
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const wss = new Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');

    const deepgramLive = deepgram.transcription.live({
        punctuate: true, interim_results: true, endpointing: 500
    });

    deepgramLive.addListener("transcriptReceived", (message) => {
        const data = JSON.parse(message);
        // console.dir(data.channel, { depth: null });
        // Write only the transcript to the console
        //console.dir(data.channel.alternatives[0].transcript, { depth: null });
    });

    ws.on('message', (message) => {
        console.log("Received audio data from client, size:", message.length);
        deepgramLive.send(message);
    });


    ws.on('close', () => {
        deepgramLive.finish();
    });
    deepgramLive.addListener('transcriptReceived', (transcription) => {
        console.log("Received transcription from Deepgram:", transcription);
        ws.send(transcription);
    });
    deepgramLive.addListener('error', (error) => {
        console.error("Deepgram error:", error);
    });
});



