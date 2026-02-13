const express = require('express');
const axios = require("axios");
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("3 Mesajlı Sistem Aktif: Her hesap 5 saniyede bir sırayla mesaj atıyor.");
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda dinleniyor.`);
});

// Değişkenleri al
const tokens = process.env.TOKENS ? process.env.TOKENS.split(',').map(t => t.trim()) : [];
const channelId = process.env.CHANNEL_ID;
const m1 = process.env.MESSAGE1;
const m2 = process.env.MESSAGE2;
const m3 = process.env.MESSAGE3;

if (tokens.length === 0 || !channelId || !m1 || !m2 || !m3) {
    console.error("HATA: Değişkenler (TOKENS, CHANNEL_ID, MESSAGE1, 2, 3) eksik!");
} else {
    tokens.forEach((token, index) => {
        // Zincirleme Başlangıç: Hesaplar 1'er saniye arayla döngüye girer
        setTimeout(() => {
            startBot(token, index + 1);
        }, index * 1000);
    });
}

function startBot(token, botNumber) {
    const label = `Hesap-${botNumber}`;
    connectToGateway(token, label);

    const msgs = [m1, m2, m3]; // 3 mesajlı liste
    let step = 0;

    setInterval(async () => {
        const currentMsg = msgs[step];
        try {
            // "Yazıyor..." animasyonu
            axios.post(`https://discord.com/api/v9/channels/${channelId}/typing`, {}, {
                headers: { "Authorization": token }
            }).catch(() => {});

            // Mesaj gönderimi
            await axios.post(`https://discord.com/api/v9/channels/${channelId}/messages`, 
                { content: currentMsg }, 
                { headers: { "Authorization": token, "Content-Type": "application/json" } }
            );

            console.log(`✅ [${label}] Gönderilen: ${currentMsg.substring(0, 15)}...`);
            
            // Sonraki mesaja geç (0 -> 1 -> 2 -> 0)
            step = (step + 1) % msgs.length;
        } catch (err) {
            console.error(`❌ [${label}] Hata: ${err.response?.status || "Bağlantı"}`);
        }
    }, 5000); // Her hesap kendi içinde 5 saniyede bir atar
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
            setInterval(() => { 
                if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 1, d: null })); 
            }, p.d.heartbeat_interval);
        }
    });
    ws.on('close', () => setTimeout(() => connectToGateway(token, label), 5000));
}
