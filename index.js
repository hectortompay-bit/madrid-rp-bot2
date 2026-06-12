const {
Client,
GatewayIntentBits,
REST,
Routes,
SlashCommandBuilder,
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const fs = require("fs");
const express = require("express");

// ================= RENDER WEB SERVER =================
const app = express();

app.get("/", (req, res) => res.send("Madrid RP Bot ONLINE"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🌐 Web server activo en puerto " + PORT));

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const STAFF_ROLE_ID = "1494769809626235122";

// ================= CLIENT =================
const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

// ================= DB =================
const DB_FILE = "./db.json";

function loadDB() {
if (!fs.existsSync(DB_FILE)) {
fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2));
}
return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function getDB() {
return loadDB();
}

function getUser(db, id) {
if (!db.users[id]) {
db.users[id] = {
money: 1000,
dni: Math.floor(Math.random() * 99999999),
multas: 0,
arrestos: 0,
sanciones: []
};
}
return db.users[id];
}

// ================= STAFF =================
function isStaff(i) {
return i.member?.roles?.cache?.has(STAFF_ROLE_ID);
}

// ================= EMBEDS =================
function embed(title, desc, color = 0x2ecc71) {
return new EmbedBuilder()
.setTitle(title)
.setDescription(desc)
.setColor(color)
.setTimestamp();
}

// ================= COMMANDS =================
const commands = [

new SlashCommandBuilder()
.setName("dni")
.setDescription("Emitir DNI")
.addStringOption(o =>
o.setName("nombre")
.setDescription("Nombre del ciudadano")
.setRequired(true)
),

new SlashCommandBuilder()
.setName("dinero")
.setDescription("Ver economía"),

new SlashCommandBuilder()
.setName("pagar")
.setDescription("Transferencia")
.addUserOption(o =>
o.setName("usuario").setDescription("Usuario").setRequired(true))
.addIntegerOption(o =>
o.setName("cantidad").setDescription("Cantidad").setRequired(true)),

new SlashCommandBuilder()
.setName("alerta")
.setDescription("Sistema de alertas RP")
.addStringOption(o =>
o.setName("nivel")
.setDescription("verde / amarilla / naranja / roja / negra")
.setRequired(true)),

new SlashCommandBuilder()
.setName("multa")
.setDescription("Multa policial")
.addUserOption(o =>
o.setName("usuario").setDescription("Usuario").setRequired(true))
.addStringOption(o =>
o.setName("articulo").setDescription("Artículo").setRequired(true))
.addIntegerOption(o =>
o.setName("cantidad").setDescription("€").setRequired(true)),

new SlashCommandBuilder()
.setName("arresto")
.setDescription("Arresto")
.addUserOption(o =>
o.setName("usuario").setDescription("Usuario").setRequired(true))
.addStringOption(o =>
o.setName("articulo").setDescription("Artículo").setRequired(true))
.addIntegerOption(o =>
o.setName("tiempo").setDescription("Minutos RP").setRequired(true)),

new SlashCommandBuilder()
.setName("citar")
.setDescription("Citación oficial")
.addUserOption(o =>
o.setName("usuario").setDescription("Usuario").setRequired(true))
.addStringOption(o =>
o.setName("mensaje").setDescription("Mensaje").setRequired(true)),

// ================= NUEVO: SANCIONES =================
new SlashCommandBuilder()
.setName("sancion")
.setDescription("Sistema de sanciones")
.addUserOption(o =>
o.setName("usuario").setDescription("Usuario").setRequired(true))
.addStringOption(o =>
o.setName("tipo").setDescription("leve / media / grave").setRequired(true))
.addStringOption(o =>
o.setName("motivo").setDescription("Motivo de la sanción").setRequired(true)),

new SlashCommandBuilder().setName("abrirservidor").setDescription("Abrir servidor"),
new SlashCommandBuilder().setName("cerrarservidor").setDescription("Cerrar servidor"),
new SlashCommandBuilder().setName("votacion").setDescription("Votación")

].map(c => c.toJSON());

// ================= REGISTER =================
const rest = new REST({ version: "10" }).setToken(TOKEN);

async function register() {
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: commands }
);
console.log("✔ Comandos registrados");
}

// ================= READY =================
client.once("ready", () => {
console.log(`✔ ONLINE: ${client.user.tag}`);
});

// ================= BOT =================
client.on("interactionCreate", async (i) => {
try {

if (!i.isChatInputCommand()) return;

await i.deferReply();

const cmd = i.commandName;

const db = getDB();
const userData = getUser(db, i.user.id);

// ================= DNI =================
if (cmd === "dni") {

const nombre = i.options.getString("nombre");

return i.editReply({
embeds: [embed(
"🪪 DNI - MADRID RP",
`✔ Nombre: ${nombre}
✔ Número: ${userData.dni}
✔ Estado: ACTIVO`,
0x3498db
)]
});
}

// ================= DINERO =================
if (cmd === "dinero") {

return i.editReply({
embeds: [embed(
"💰 ECONOMÍA",
`✔ Dinero: ${userData.money}€
✔ Multas: ${userData.multas}€
✔ Arrestos: ${userData.arrestos}`,
0x2ecc71
)]
});
}

// ================= PAGAR =================
if (cmd === "pagar") {

const user = i.options.getUser("usuario");
const amount = i.options.getInteger("cantidad");

const target = getUser(db, user.id);

if (userData.money < amount)
return i.editReply({ embeds: [embed("ERROR", "No tienes dinero suficiente", 0xe74c3c)] });

userData.money -= amount;
target.money += amount;

saveDB(db);

return i.editReply({
embeds: [embed(
"💸 TRANSFERENCIA",
`De: <@${i.user.id}>
A: <@${user.id}>
Cantidad: ${amount}€`,
0x3498db
)]
});
}

// ================= ALERTA =================
if (cmd === "alerta") {

if (!isStaff(i))
return i.editReply("❌ SOLO STAFF");

const lvl = i.options.getString("nivel");

const alerts = {
verde: "🟢 ALERTA VERDE\nPatrullaje normal",
amarilla: "🟡 ALERTA AMARILLA\nRiesgo medio",
naranja: "🟠 ALERTA NARANJA\nAlto riesgo",
roja: "🔴 ALERTA ROJA\nEmergencia total",
negra: "⚫ ALERTA NEGRA\nCrisis máxima"
};

const colors = {
verde: 0x2ecc71,
amarilla: 0xf1c40f,
naranja: 0xe67e22,
roja: 0xe74c3c,
negra: 0x000000
};

return i.editReply({
embeds: [embed(
"SISTEMA DE ALERTAS - MADRID RP",
alerts[lvl] || "Nivel inválido",
colors[lvl] || 0x3498db
)]
});
}

// ================= MULTA =================
if (cmd === "multa") {

if (!isStaff(i))
return i.editReply("❌ SOLO STAFF");

const user = i.options.getUser("usuario");
const art = i.options.getString("articulo");
const amount = i.options.getInteger("cantidad");

const target = getUser(db, user.id);
target.multas += amount;

saveDB(db);

return i.editReply({
embeds: [embed(
"MULTA POLICIAL",
`Ciudadano: ${user.username}
Artículo: ${art}
Importe: ${amount}€`,
0xe67e22
)]
});
}

// ================= ARRESTO =================
if (cmd === "arresto") {

if (!isStaff(i))
return i.editReply("❌ SOLO STAFF");

const user = i.options.getUser("usuario");
const art = i.options.getString("articulo");
const time = i.options.getInteger("tiempo");

const target = getUser(db, user.id);
target.arrestos++;

saveDB(db);

return i.editReply({
embeds: [embed(
"ARRESTO",
`Detenido: ${user.username}
Artículo: ${art}
Tiempo: ${time} min RP`,
0xe74c3c
)]
});
}

// ================= CITAR =================
if (cmd === "citar") {

if (!isStaff(i))
return i.editReply("❌ SOLO STAFF");

const user = i.options.getUser("usuario");
const msg = i.options.getString("mensaje");

return i.editReply({
embeds: [embed(
"CITACIÓN",
`Usuario: ${user.username}

Mensaje:
${msg}

➡ Acudir a sala de espera`,
0xf1c40f
)]
});
}

// ================= SANCIONES NUEVO =================
if (cmd === "sancion") {

if (!isStaff(i))
return i.editReply("❌ SOLO STAFF");

const user = i.options.getUser("usuario");
const tipo = i.options.getString("tipo");
const motivo = i.options.getString("motivo");

const target = getUser(db, user.id);

target.sanciones.push({
tipo,
motivo,
fecha: Date.now()
});

saveDB(db);

return i.editReply({
embeds: [embed(
"SANCIÓN - MADRID RP",
`Usuario: ${user.username}
Tipo: ${tipo}
Motivo: ${motivo}
Estado: REGISTRADA`,
0xe74c3c
)]
});
}

// ================= SERVIDOR =================
if (cmd === "abrirservidor")
return i.editReply({ embeds: [embed("SERVIDOR", "🟢 ABIERTO", 0x2ecc71)] });

if (cmd === "cerrarservidor")
return i.editReply({ embeds: [embed("SERVIDOR", "🔴 CERRADO", 0xe74c3c)] });

// ================= VOTACIÓN =================
if (cmd === "votacion") {

let yes = 0;
let no = 0;

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("yes").setLabel("Sí").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("no").setLabel("No").setStyle(ButtonStyle.Danger)
);

const msg = await i.editReply({
embeds: [embed("VOTACIÓN", "Vota ahora", 0x3498db)],
components: [row]
});

const collector = msg.createMessageComponentCollector({ time: 60000 });

collector.on("collect", async b => {
if (b.customId === "yes") yes++;
if (b.customId === "no") no++;

await b.update({
embeds: [embed("VOTACIÓN", `Sí: ${yes} | No: ${no}`, 0x3498db)],
components: [row]
});
});

collector.on("end", async () => {
await msg.edit({
embeds: [embed("RESULTADO FINAL", `Sí: ${yes} | No: ${no}`, 0x000000)],
components: []
});
});
}

} catch (err) {
console.log(err);
try {
if (i.deferred || i.replied)
return i.editReply("❌ ERROR");
return i.reply({ content: "❌ ERROR", ephemeral: true });
} catch {}
}
});

// ================= START =================
(async () => {
await register();
await client.login(TOKEN);
})();