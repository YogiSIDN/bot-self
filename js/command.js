const fs = require("fs")
const util = require("util")
const moment = require("moment-timezone")
const { exec } = require("child_process")
const { red, green, yellow, blue, magenta, cyan, white } = require("kleur")

const { getAdmin, parseMention } = require("../js/function")

module.exports = async (sock, m, msg, chatUpdate, store) => {
    try {
        // console.log(JSON.stringify(msg, null, 2))
        const body = (m.mtype === "conversation" 
            ? m.message.conversation : m.mtype === "imageMessage" 
            ? m.message.imageMessage.caption : m.mtype === "videoMessage" 
            ? m.message.videoMessage.caption : m.mtype === "extendedTextMessage" 
            ? m.message.extendedTextMessage.text : m.mtype === "buttonsResponseMessage" 
            ? m.message.buttonsResponseMessage.selectedButtonId : m.mtype === "listResponseMessage" 
            ? m.message.listResponseMessage.singleSelectReply.selectedRowId : m.mtype === "interactiveMessage" 
            ? m.message.interactiveMessage?.buttonReply?.buttonId : "")
        const budy = (typeof m.text == "string" ? m.text : "")
        
        const prefix = "!"
        const ctrCmd = body || ""
        const command = ctrCmd.toLowerCase().split(" ")[0] || ""
        const isCmd = command.startsWith(prefix)
        
        const args = body.trim().split(/ +/).slice(1)
        const text = q = args.join(" ")
        const sender = m.key.fromMe ? sock.user.id.split(":")[0] + "@s.whatsapp.net" || sock.user.id : m.key.participant || m.key.remoteJid
        const date = moment.tz("Asia/Jakarta").format("DD/MM/YYYY")
        const time = moment.tz("Asia/Jakarta").format("HH:mm:ss")
        const botNumber = await sock.decodeJid(sock.user.id)
        const groupMetadata = m.isGroup ? await sock.groupMetadata(m.chat) : ""
        const participants = m.isGroup ? await groupMetadata.participants : ""
        const groupAdmins = m.isGroup ? await getAdmin(participants) : ""
        const isGroupAdmins = m.isGroup ? groupAdmins.includes(m.sender) : false
        const isBotGroupAdmins = m.isGroup ? groupAdmins.includes(botNumber) : false
    
        // LOG
        if (isCmd && !m.isGroup) {
            // console.log("[CMD] " + time + " from " + sender + " in Private chat.")
            console.log(
              green("[CMD]") +
                " " +
                yellow(time) +
                " " +
                green("from") +
                " " +
                yellow(sender) +
                " " +
                green("in") +
                " " +
                white("Private chat.")
            );
        }
        if (isCmd && m.isGroup) {
            // console.log("[CMD] " + time + " from " + sender + " in Group chat.")
            console.log(
              green("[CMD]") +
                " " +
                yellow(time) +
                " " +
                green("from") +
                " " +
                yellow(sender) +
                " " +
                green("in") +
                " " +
                white("Group chat.")
            );
        }
        
        switch (command) {
            case prefix+"help": case prefix+"menu": {
                const description = `👋 Hallo!

Bot ini dibuat bagian dari hiburan belaka.
https://mysu-inky.vercel.app

⏲️ ${time} WiB

┌ ${prefix}help
├ ${prefix}close 
├ ${prefix}revoke
├ ${prefix}grouplink
└ ${prefix}null

Dikembangkan oleh @6281410404318`
                sock.sendMessage(m.chat, { text: description, mentions: parseMention(description) }, { quoted: m })
                break
            }
            // BAGIAN ADMIN
            case prefix+"close": {
                if (!m.isGroup) return
                if (!isBotGroupAdmins) return m.reply("Perintah ini hanya bisa di gunakan ketika bot menjadi admin!")
                if (!isGroupAdmins) return m.reply("Perintah ini hanya bisa di gunakan oleh admin!")
                if (args[0] === "false") {
                sock.groupSettingUpdate(m.chat, "not_announcement")
                } else if (args[0] === "true") {
                await sock.groupSettingUpdate(m.chat,"announcement")
                } else {
                    const button = [{ buttonId: "!close true", buttonText: { displayText: "true" }}, { buttonId: "!close false", buttonText: { displayText: "false" }}]
                    await sock.sendMessage(m.chat, { text: "Untuk menutup group tekan *true* dan membuka group tekan *false*", footer: "https://mysu-inky.vercel.app", buttons: button })
                // await sock.groupSettingUpdate(m.chat, "announcement")
                }
                break
            }
            case prefix+"revoke": {
                if (!m.isGroup) return
                if (!isBotGroupAdmins) return m.reply("Perintah ini hanya bisa di gunakan ketika bot menjadi admin!")
                if (!isGroupAdmins) return m.reply("Perintah ini hanya bisa di gunakan oleh admin!")
                await sock.groupRevokeInvite(m.chat)
                break
            }
            case prefix+"grouplink": {
                if (!m.isGroup) return
                if (!isBotGroupAdmins) return m.reply("Perintah ini hanya bisa di gunakan ketika bot menjadi admin!")
                if (!isGroupAdmins) return m.reply("Perintah ini hanya bisa di gunakan oleh admin!")
                const nlink = await sock.groupInviteCode(m.chat)
                m.reply("https://chat.whatsapp.com/" + nlink)
                break
            }
            default:
            if (budy.startsWith("$")) {
            // if (!m.key.fromMe && !isDev) return
            const command = budy.slice(2) // Mengambil perintah setelah "$ "
        
            // Menjalankan perintah shell
            exec(command, (err, stdout) => {
                if (err) {
                    return m.reply(`${err}`) // Kirim pesan error jika terjadi kesalahan
                }
                if (stdout) {
                    return m.reply(stdout) // Kirim output jika perintah berhasil
                }
            })
            }
            if (budy.startsWith("..")) {
            // if (!m.key.fromMe && !isDev) return
            try {
                // Mengambil pesan setelah "..""
                const result = await eval(`(async () => { return ${budy.slice(3)} })()`)
                
                // Fungsi untuk memformat dan mengirim balasan
                m.reply(util.format(result))
            } catch (e) {
                m.reply(String(e)) // Tangani error dan kirim pesan error
            }
            }
            if (budy.startsWith("=>")) {
            // if (!m.key.fromMe && !isDev) return
            const konsol = budy.slice(3) // Mengambil pesan setelah "=>"
        
            // Fungsi untuk memformat dan mengirim balasan
            const Return = (sul) => {
                let sat = JSON.stringify(sul, null, 2) // Mengubah objek ke string JSON
                let bang = util.format(sat)
        
                if (sat === undefined) {
                    bang = util.format(sul) // Jika undefined, format langsung
                }
        
                return m.reply(bang) // Kirim balasan
            }
        
            try {
                // Mengeksekusi kode yang diberikan
                const result = eval(`(async () => { ${konsol} })()`)
                m.reply(util.format(result)) // Kirim hasil eksekusi
            } catch (e) {
                m.reply(String(e)) // Tangani error dan kirim pesan error
            }
        }
        }
    } catch (error) {
      console.error(error)
      m.reply("💔 Server bermasalah.")
  }
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log("Memperbarui js/command.js")
  delete require.cache[file]
  require(file)
})
