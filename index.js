const express = require('express');
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Botlar 1 saniye aralıkla sırayla çalışıyor.");
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif.`);
});

// Environment değişkenlerini al ve temizle
const tokens = process.env.TOKENS ? process.env.TOKENS.split(',').map(t => t.trim()) : [];
const channelId = process.env.CHANNEL_ID;
const message1 = process.env.MESSAGE1;
const message2 = process.env.MESSAGE2;

if (tokens.length < 2 || !channelId || !message1 || !message2) {
    console.error("HATA: Değişkenler eksik! (TOKENS, CHANNEL_ID, MESSAGE1, MESSAGE2)");
} else {
    console.log("Sıralı mod başlatıldı: Her mesaj arası 1 saniye.");

    let currentAccount = 0; // 0: Hesap 1, 1: Hesap 2

    // Ana Döngü: Her 1 saniyede bir tetiklenir
    setInterval(async () => {
        const token = tokens[currentAccount];
        const content = (currentAccount === 0) ? message1 : message2;
        const label = `Hesap ${currentAccount + 1}`;

        await sendAction(token, content, label);

        // Sırayı değiştir: 0 ise 1, 1 ise 0 yap
        currentAccount = (currentAccount + 1) % 2;

    }, 1000); // 1 saniye bekleme süresi
}

async function sendAction(token, content, label) {
    const url = `https://discord.com/api/v9/channels/${channelId}`;
    const headers = { 
        "Authorization": token, 
        "Content-Type": "application/json" 
    };

    try {
        // "Yazıyor..." animasyonu gönder
        axios.post(`${url}/typing`, {}, { headers }).catch(() => {});
        
        // Mesajı gönder
        await axios.post(`${url}/messages`, { content }, { headers });
        
        console.log(`✅ [${label}] Mesaj gönderildi: ${content}`);
    } catch (err) {
        if (err.response?.status === 429) {
            console.error(`⚠️ [${label}] Rate Limit: Çok hızlı!`);
        } else {
            console.error(`❌ [${label}] Hata:`, err.response?.status);
        }
    }
}
