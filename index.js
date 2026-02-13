const express = require('express');
const axios = require("axios");
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Zincirleme Bot Sistemi Aktif: Hesaplar 1sn arayla nöbetleşe atıyor.");
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda dinleniyor.`);
});

const tokens = process.env.TOKENS ? process.env.TOKENS.split(',').map(t => t.trim()) : [];
const channelId = process.env.CHANNEL_ID;
const message1 = process.env.MESSAGE1;
const message2 = process.env.MESSAGE2;

if (tokens.length === 0 || !channelId || !message1 || !message2) {
    console.error("HATA: Değişkenler eksik! TOKENS, CHANNEL_ID, MESSAGE1, MESSAGE2 kontrol et.");
} else {
    console.log(`${tokens.length} hesap için zincirleme döngü kuruluyor...`);

    tokens.forEach((token, index) => {
        // ZİNCİRLEME MANTIK:
        // Her hesap bir sonrakinden 1 saniye sonra başlar.
        // Ama her hesap kendi mesajını 3 saniyede bir gönderir.
        const delay = index * 1000; 

        setTimeout(() => {
            startBot(token, index + 1);
        }, delay);
    });
}

function startBot(token, botNumber) {
    const label = `Hesap-${botNumber}`;
    
    // 7/24 Aktiflik (Rahatsız Etmeyin)
    connectToGateway(token, label);

    const msgs = [message1, message2];
    let step = 0;

    // Her hesap 3 saniyede bir kendi sırasındaki mesajı atar
    setInterval(async () => {
        const currentMsg = msgs[step];
        
        try {
            // Yazıyor sinyali
            axios.post(`https://discord.com/api/v9/channels/${channelId}/typing`, {}, {
                headers: { "Authorization": token }
            }).catch(() => {});

            // Mesaj gönderimi
            await axios.post(`https://discord.com/api/v9/channels/${channelId}/messages`, 
                { content: currentMsg }, 
                { headers: { "Authorization": token, "Content-Type": "application/json" } }
            );

            console.log(`✅ [${label}] Gönderdi: ${currentMsg}`);
            
            // Mesaj değiştir (M1 -> M2 -> M1...)
            step = (step + 1) % msgs.length;

        } catch (err) {
            console.error(`❌ [${label}] Hata: ${err.response?.status || "Bağlantı"}`);
        }
    }, 3000); // Kendi döngüsü 3 saniye
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
