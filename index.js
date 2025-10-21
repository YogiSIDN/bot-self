require("dotenv").config()
const { 
    jidDecode,
    makeWASocket, 
    DisconnectReason,
    makeInMemoryStore,
    useMultiFileAuthState
} = require("wa-bot")
const { 
    useMongoAuthState 
} = require("session")
const fs = require("fs")
const pino = require("pino")
const readline = require("readline")
const { Boom } = require("@hapi/boom")
const { smsg } = require("./js/function")

const store = makeInMemoryStore({
  logger: pino().child({ level: "silent", stream: "store" })
})

const question = (text) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(text, resolve)
  })
}

async function connections() {
    const { state, saveCreds } = await useMongoAuthState(process.env.MONGODB_URI)
    const sock = makeWASocket({
        auth: state,
        syncFullHistory: true,
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    })
    
    if(!sock.authState.creds.registered) {
        const phoneNumber = await question('Masukan nomor Whatsapp awali dengan 62:\n');
        const code = await sock.requestPairingCode(phoneNumber.trim())
        console.log(`⚠︎ Kode Pairing Bot Whatsapp kamu : ${code}`)
    }
    
    sock.ev.on("creds.update", saveCreds)
    store.bind(sock.ev)
    sock.public = true
    
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect} = update
        if (connection === "close") {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode
            if (reason === DisconnectReason.badSession) {
                console.log("File Sesi Buruk, Harap Hapus Sesi dan Pindai Lagi")
                process.exit()
            } else if (reason === DisconnectReason.connectionClosed) {
                console.log("Koneksi terputus, menyambungkan kembali....")
                connections()
            } else if (reason === DisconnectReason.connectionLost) {
                console.log("Koneksi terputus dari server, menyambungkan kembali...")
                connections()
            } else if (reason === DisconnectReason.connectionReplaced) {
                console.log("Koneksi diganti, Sesi baru dibuka, Silakan mulai ulang bot")
                process.exit()
            } else if (reason === DisconnectReason.loggedOut) {
                console.log("Perangkat keluar, Harap hapus folder Sesi dan Pindai lagi.")
                process.exit()
            } else if (reason === DisconnectReason.restartRequired) {
                console.log("Diperlukan Restart, Memulai ulang...")
                connections()
            } else if (reason === DisconnectReason.timedOut) {
                console.log("Waktu koneksi telah habis, Menyambung kembali...")
                connections()
            } else {
                console.log("Alasan terputus tidak diketahui: " + `${reason}|${connection}`)
                connections()
            }
        } else if (connection === "connecting") {
            console.log("Menghubungkan...")
        } else if (connection === "open") {
            console.log("Tersambung...")
        }
    })
    
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            let msg = chatUpdate.messages[0]
            if (!msg.message) return
            msg.message = (Object.keys(msg.message)[0] === "ephemeralMessage") ? msg.message.ephemeralMessage.message : msg.message
            if (msg.key && msg.key.remoteJid === "status@broadcast") return
            if (!sock.public && !msg.key.fromMe && chatUpdate.type === "notify") return
            if (msg.key.id.startsWith("BAE5") && msg.key.id.length === 16) return
            const m = smsg(sock, msg, store)
            require("./js/command")(sock, m, msg, chatUpdate, store)
        } catch (error) {
            console.log(error)
        }
    })
    
    sock.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + "@" + decode.server || jid
        } else return jid
    }
    
    sock.sendText = (jid, text, quoted = "", options) => sock.sendMessage(jid, { text: text, ...options }, { quoted })
    
}
connections()

let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log("Memperbarui index.js")
  delete require.cache[file]
  require(file)
})