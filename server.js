require('dotenv').config();
const express = require('express');
const { Server } = require('ws');
const { Deepgram } = require('@deepgram/sdk');

const app = express();
const PORT = process.env.PORT || 3001;
const deepgramApiKey = '11dd3c7b32a0b1fa5e360742b8c3c73346c55ebc';
const deepgram = new Deepgram(deepgramApiKey);
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const wss = new Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');
    var deepgramLive = deepgram.transcription.live({
        punctuate: true, interim_results: true, endpointing: 300
    });

    deepgramLive.addListener('transcriptReceived', (transcription) => {
        if (ws.readyState === ws.OPEN) {
            ws.send(transcription);
        }
    });

    deepgramLive.addListener('error', (error) => {
        console.error("Deepgram error:", error);
    });

    ws.on('message', (message) => {
        if (typeof message !== 'string') {
            // Handle binary audio data
            if (deepgramLive) {
                try {
                    deepgramLive.send(message);
                } catch (error) {
                    console.error("Error sending message to Deepgram:", error);
                    // Consider restarting Deepgram live session here if needed
                }
            }
        } else {
            // Handle JSON messages
            try {
                const data = JSON.parse(message);
                if (data.action && data.action === 'stop_transcription') {
                    console.log("Stopping transcription");
                    if (deepgramLive) {
                        deepgramLive.finish();
                        // Delay starting a new session
                        setTimeout(() => {
                            deepgramLive = startDeepgramLive();
                        }, 1000);
                    }
                }
            } catch (error) {
                console.error("Error parsing JSON:", error);
            }
        }
    });
    ws.on('close', () => {
        console.log("WebSocket connection closed");
        if (deepgramLive) {
            deepgramLive.finish();
            deepgramLive = null;
        }
    });

});
