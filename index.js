const express = require('express');
const axios = require("axios");
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Sınırsız Token Desteği: Tüm hesaplar sırayla MESSAGE1 ve MESSAGE2 atıyor!");
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif.`);
});

// Değişkenleri al ve temizle
const tokens = process.env.TOKENS ? process.env.TOKENS.split(',').map(t => t.trim()) : [];
const channelId = process.env.CHANNEL_ID;
const message1 = process.env.MESSAGE1;
const message2 = process.env.MESSAGE2;

if (tokens.length === 0 || !channelId || !message1 || !message2) {
    console.error("HATA: Değişkenler eksik! Lütfen TOKENS, CHANNEL_ID, MESSAGE1 ve MESSAGE2 ayarlarını kontrol edin.");
} else {
    console.log(`${tokens.length} adet hesap yüklendi. Döngü başlıyor...`);

    // Her token için sistemi başlat
    tokens.forEach((token, index) => {
        // Çakışmayı önlemek için her hesabı (index * 1000ms) kadar geciktirerek başlatıyoruz
        // Örneğin: 1. hesap 0sn, 2. hesap 1sn, 3. hesap 2sn sonra başlar.
        const startDelay = index * 1000; 

        setTimeout(() => {
            setupAccount(token, `Hesap-${index + 1}`);
        }, startDelay);
    });
}

function setupAccount(token, label) {
    // 7/24 Aktif tutma ve Rahatsız Etmeyin modu
    connectToGateway(token, label);

    const messages = [message1, message2];
    let msgIndex = 0;

    // Her hesap kendi içinde 3 saniyede bir mesaj atar
    setInterval(async () => {
        const currentMessage = messages[msgIndex];
        await sendAction(token, currentMessage, label);
        
        // Bir sonraki mesaj indexine geç (0 -> 1 -> 0)
        msgIndex = (msgIndex + 1) % messages.length;
    }, 3000); 
}

// Discord 7/24 Aktiflik Bağlantısı
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
        const payload = JSON.parse(data);
        if (payload.op === 10) {
            setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ op: 1, d: null }));
                }
            }, payload.d.heartbeat_interval);
        }
    });

    ws.on('close', () => {
        // Bağlantı koparsa 5 saniye sonra tekrar dene
        setTimeout(() => connectToGateway(token, label), 5000);
    });
}

async function sendAction(token, content, label) {
    const url = `https://discord.com/api/v9/channels/${channelId}`;
    const headers = { "Authorization": token, "Content-Type": "application/json" };

    try {
        // "Yazıyor..." animasyonu
        axios.post(`${url}/typing`, {}, { headers }).catch(() => {});
        
        // Mesajı gönder
        await axios.post(`${url}/messages`, { content }, { headers });
        console.log(`✅ [${label}] Mesaj Başarılı: ${content.substring(0, 20)}...`);
    } catch (err) {
        if (err.response?.status === 429) {
            console.error(`⚠️ [${label}] Rate Limit!`);
        } else {
            console.error(`❌ [${label}] Hata:`, err.response?.status || "Bağlantı Sorunu");
        }
    }
}
