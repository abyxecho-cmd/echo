const express = require('express');
const axios = require("axios");
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Güvenli Mod Aktif: Hesaplar 10sn aralıkla, 2sn farkla çalışıyor.");
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda dinleniyor.`);
});

const tokens = process.env.TOKENS ? process.env.TOKENS.split(',').map(t => t.trim()) : [];
const channelId = process.env.CHANNEL_ID;
const m1 = process.env.MESSAGE1;
const m2 = process.env.MESSAGE2;
const m3 = process.env.MESSAGE3;

if (tokens.length === 0 || !channelId || !m1 || !m2 || !m3) {
    console.error("HATA: Değişkenler eksik!");
} else {
    tokens.forEach((token, index) => {
        // Hesaplar arası çakışmayı önlemek için 2 saniye farkla başlatıyoruz
        setTimeout(() => {
            startBot(token, index + 1);
        }, index * 2000); 
    });
}

function startBot(token, botNumber) {
    const label = `Hesap-${botNumber}`;
    connectToGateway(token, label);

    const msgs = [m1, m2, m3];
    let step = 0;

    // GÜVENLİ DÖNGÜ: Her hesap 10 saniyede bir mesaj atar
    setInterval(async () => {
        const currentMsg = msgs[step];
        try {
            // Yazıyor sinyali (Hata alsa da döngüyü bozmaz)
            axios.post(`https://discord.com/api/v9/channels/${channelId}/typing`, {}, {
                headers: { "Authorization": token }
            }).catch(() => {});

            // Mesaj gönderimi
            await axios.post(`https://discord.com/api/v9/channels/${channelId}/messages`, 
                { content: currentMsg }, 
                { headers: { "Authorization": token, "Content-Type": "application/json" } }
            );

            console.log(`✅ [${label}] Mesaj Başarılı.`);
            step = (step + 1) % msgs.length;
        } catch (err) {
            if (err.response?.status === 429) {
                console.error(`⚠️ [${label}] RATE LIMIT: Discord yavaşlamanı istiyor!`);
            } else {
                console.error(`❌ [${label}] Hata: ${err.response?.status || "Bağlantı"}`);
            }
        }
    }, 10000); // 10 saniyeye çıkarıldı (Kısıtlama yememek için)
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
