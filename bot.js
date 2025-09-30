const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// Replace with your actual Pabbly webhook URL
const PABBLY_WEBHOOK_URL = "https://connect.pabbly.com/workflow/sendwebhookdata/IjU3NjYwNTY1MDYzMTA0MzM1MjZjNTUzNjUxM2Ii_pc";

// ✅ Function to send data to Pabbly
async function sendToPabbly(data) {
    try {
        await axios.post(PABBLY_WEBHOOK_URL, data);
        console.log("✅ Data sent to Pabbly successfully!");
    } catch (error) {
        console.error("❌ Error sending data to Pabbly:", error.message);
    }
}

// 👇 FIX: added puppeteer args for root server
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Track users' progress and answers
let userProgress = {};

// Questions for free text
const questions = [
    "✅ Great! First, may I know your Full Name?",
    "What's your Phone Number?",
    "What's your Email?",
    "What's your Street Address?",
    "What's your Postal Code?"
];

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('WhatsApp bot is ready!');

    // 🔹 TEMP TEST: send fake data to Pabbly when bot starts
    await sendToPabbly({
        fullName: "Test User",
        phone: "9876543210",
        email: "test@example.com",
        streetAddress: "123 Test Street",
        postalCode: "560001",
        propertyType: "3BHK",
        budget: "20+ lakhs",
        callTime: "10AM-4PM"
    });
});

client.on('message', async message => {
    const from = message.from;
    const msg = message.body.trim();

    if (msg.toLowerCase().includes("start") && !userProgress[from]) {
        userProgress[from] = { step: 0, answers: {} };
        message.reply(questions[0]);
        return;
    }

    if (userProgress[from]) {
        let step = userProgress[from].step;

        if (step <= 4) {
            switch(step){
                case 0: userProgress[from].answers.fullName = msg; break;
                case 1: userProgress[from].answers.phone = msg; break;
                case 2: userProgress[from].answers.email = msg; break;
                case 3: userProgress[from].answers.streetAddress = msg; break;
                case 4: userProgress[from].answers.postalCode = msg; break;
            }

            step++;
            userProgress[from].step = step;

            if(step <= 4){
                message.reply(questions[step]);
            } else {
                message.reply(
                    "Which type of property do you own?\n1) 2BHK\n2) 3BHK\n3) 4BHK/Duplex\n4) Villa"
                );
            }
            return;
        }

        if(step === 5){
            if (msg === "1") userProgress[from].answers.propertyType = "2BHK";
            else if (msg === "2") userProgress[from].answers.propertyType = "3BHK";
            else if (msg === "3") userProgress[from].answers.propertyType = "4BHK/Duplex";
            else if (msg === "4") userProgress[from].answers.propertyType = "Villa";
            else { message.reply("❌ Please reply with 1, 2, 3, or 4."); return; }

            userProgress[from].step++;
            message.reply(
                "What is your budget?\n1) Less then 10 lakhs\n2) 10 - 20 lakhs\n3) 20 - 30 lakhs\n4) 35+ lakhs"
            );
            return;
        }

        if(step === 6){
            if (msg === "1") userProgress[from].answers.budget = "Less then 10 lakhs";
            else if (msg === "2") userProgress[from].answers.budget = "10 - 20 lakhs";
            else if (msg === "3") userProgress[from].answers.budget = "20 - 30 lakhs";
            else if (msg === "4") userProgress[from].answers.budget = "35+ lakhs";
            else { message.reply("❌ Please reply with 1, 2, 3, or 4."); return; }

            userProgress[from].step++;
            message.reply(
                "When can we call you? (Choose best time)\n1) Between 10:00A.M - 12:00P.M\n2) Between 1:00P.M - 3:00P.M\n3) Between 4:00P.M - 7:00P.M"
            );
            return;
        }

        if(step === 7){
            if (msg === "1") userProgress[from].answers.callTime = "Between 10:00A.M - 12:00P.M";
            else if (msg === "2") userProgress[from].answers.callTime = "Between 1:00P.M - 3:00P.M";
            else if (msg === "3") userProgress[from].answers.callTime = "Between 4:00P.M - 7:00P.M";
            else { message.reply("❌ Please reply with 1, 2, or 3."); return; }

            message.reply("✅ Thanks! We’ll get back to you soon with the details.");
            console.log(`Collected info from ${from}:`, userProgress[from].answers);

            await sendToPabbly(userProgress[from].answers);

            delete userProgress[from];
            return;
        }
    }
});

client.initialize();
