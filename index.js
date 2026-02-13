const express = require('express');
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Botlar aktif, yazıyor animasyonu devrede!");
});

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda dinleniyor.`);
});

// Environment değişkenlerini al
const tokens = process.env.TOKENS ? process.env.TOKENS.split(',') : [];
const channelId = process.env.CHANNEL_ID;
const message1 = process.env.MESSAGE1;
const message2 = process.env.MESSAGE2;

if (tokens.length === 0 || !channelId || !message1 || !message2) {
    console.error("HATA: Değişkenler eksik (TOKENS, CHANNEL_ID, MESSAGE1 veya MESSAGE2)!");
} else {
    console.log(`${tokens.length} adet hesap için döngü başlıyor...`);
    
    tokens.forEach((token, index) => {
        const cleanToken = token.trim();
        const msgToSend = (index % 2 === 0) ? message1 : message2;

        // Her 1 saniyede bir işlem yap
        setInterval(() => {
            sendTypingAndMessage(cleanToken, msgToSend);
        }, 1000); 
    });
}

async function sendTypingAndMessage(token, content) {
    const url = `https://discord.com/api/v9/channels/${channelId}`;
    const headers = {
        "Authorization": token,
        "Content-Type": "application/json"
    };

    try {
        // 1. "Yazıyor..." animasyonunu tetikle
        await axios.post(`${url}/typing`, {}, { headers });

        // 2. Mesajı gönder
        await axios.post(`${url}/messages`, { content: content }, { headers });
        
        console.log(`✅ [${token.substring(0, 5)}...] Yazıyor ve mesaj attı: "${content}"`);
    } catch (err) {
        console.error("❌ İşlem başarısız:", err.response?.status, err.response?.data?.message);
    }
}
