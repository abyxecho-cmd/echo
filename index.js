const express = require('express');
const axios = require("axios");
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Zincirleme Sistem Aktif: Her saniye 1 hesap, her hesap 5 saniyede bir atıyor.");
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif.`);
});

const tokens = process.env.TOKENS ? process.env.TOKENS.split(',').map(t => t.trim()) : [];
const channelId = process.env.CHANNEL_ID;
const m1 = process.env.MESSAGE1;
const m2 = process.env.MESSAGE2;
const m3 = process.env.MESSAGE3;

if (tokens.length === 0 || !channelId || !m1 || !m2 || !m3) {
    console.error("HATA: Değişkenler eksik! TOKENS, CHANNEL_ID ve MESSAGE 1-2-3'ü kontrol et.");
} else {
    console.log(`${tokens.length} hesap için saniyelik geçiş sistemi başlatılıyor...`);

    tokens.forEach((token, index) => {
        // HESAP BAŞLATMA ZAMANLAMASI:
        // 1. Hesap: 0. saniye başlar
        // 2. Hesap: 1. saniye başlar
        // 3. Hesap: 2. saniye başlar...
        const startOffset = index * 1000; 

        setTimeout(() => {
            startBot(token, index + 1);
        }, startOffset);
    });
}

function startBot(token, botNumber) {
    const label = `Hesap-${botNumber}`;
    connectToGateway(token, label);

    const msgs = [m1, m2, m3];
    let step = 0;

    // Her hesap kendi mesajını attıktan tam 5 saniye (5000ms) sonra tekrar atar.
    setInterval(async () => {
        const currentMsg = msgs[step];
        try {
            await axios.post(`https://discord.com/api/v9/channels/${channelId}/messages`, 
                { content: currentMsg }, 
                { headers: { "Authorization": token, "Content-Type": "application/json" } }
            );

            console.log(`✅ [${label}] Mesaj Gönderildi.`);
            step = (step + 1) % msgs.length;
        } catch (err) {
            console.error(`❌ [${label}] Hata: ${err.response?.status || "Bağlantı Kesildi"}`);
        }
    }, 5000); 
}

function connectToGateway(token, label) {
    const ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');
    ws.on('open', () => {
        ws.send(JSON.stringify({
            op: 2,
            d: {
                token: token,
                properties: { $os: 'linux', $browser: 'chrome', $device: 'chrome' },
                presence: { status: 'dnd', afk: false }
            }
        }));
    });
    ws.on('message', (data) => {
        const p = JSON.parse(data);
        if (p.op === 10) {
            setInterval(() => { if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 1, d: null })); }, p.d.heartbeat_interval);
        }
    });
    ws.on('close', () => setTimeout(() => connectToGateway(token, label), 5000));
}
