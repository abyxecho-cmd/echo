const express = require('express');
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Nöbetleşe sistem aktif: Hesaplar 1.5 saniye arayla, toplam 3 saniyede bir atıyor.");
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif.`);
});

// Değişkenleri al
const tokens = process.env.TOKENS ? process.env.TOKENS.split(',').map(t => t.trim()) : [];
const channelId = process.env.CHANNEL_ID;
const message1 = process.env.MESSAGE1;
const message2 = process.env.MESSAGE2;

if (tokens.length < 2 || !channelId || !message1 || !message2) {
    console.error("HATA: Değişkenler eksik! (TOKENS, CHANNEL_ID, MESSAGE1, MESSAGE2)");
} else {
    console.log("Sistem başlatıldı. Hesaplar birbirini takip edecek şekilde ayarlandı.");

    // HESAP 1: Hemen başlar ve her 3 saniyede bir atar
    setInterval(() => {
        sendAction(tokens[0], message1, "Hesap 1");
    }, 3000);

    // HESAP 2: Hesap 1'den tam 1.5 saniye sonra başlar ve her 3 saniyede bir atar
    setTimeout(() => {
        setInterval(() => {
            sendAction(tokens[1], message2, "Hesap 2");
        }, 3000);
    }, 1500); // 1.5 saniye gecikmeli başlama
}

async function sendAction(token, content, label) {
    const url = `https://discord.com/api/v9/channels/${channelId}`;
    const headers = { 
        "Authorization": token, 
        "Content-Type": "application/json" 
    };

    try {
        // "Yazıyor..." animasyonu (Hız kaybı olmaması için bekletmiyoruz)
        axios.post(`${url}/typing`, {}, { headers }).catch(() => {});
        
        // Mesajı gönder
        await axios.post(`${url}/messages`, { content }, { headers });
        console.log(`✅ [${label}] Mesaj gitti.`);
    } catch (err) {
        if (err.response?.status === 429) {
            console.error(`⚠️ [${label}] Rate Limit! Discord yavaşlamanı istiyor.`);
        } else {
            console.error(`❌ [${label}] Hata:`, err.response?.status);
        }
    }
}
