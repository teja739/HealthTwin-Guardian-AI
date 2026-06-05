import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");
const dataDir = join(__dirname, "data");
const dbPath = join(dataDir, "healthtwin.db");
const port = Number(process.env.PORT || 4173);

const ISSUER = "HealthTwin Guardian AI";
const DEMO_EMAIL = "demo.patient@healthtwin.ai";
const DEMO_PASSWORD = "GuardianSecure2026";

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");

const json = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
};

const text = (res, status, body, contentType = "text/plain; charset=utf-8") => {
  res.writeHead(status, { "content-type": contentType });
  res.end(body);
};

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
};

const nowIso = () => new Date().toISOString();
const expiresIso = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += base32Alphabet[(value << (5 - bits)) & 31];
  }

  return output;
};

const base32Decode = (secret) => {
  const clean = String(secret).replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of clean) {
    const index = base32Alphabet.indexOf(char);
    if (index < 0) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

const generateTotpSecret = () => base32Encode(randomBytes(20));

const hotp = (secret, counter) => {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  let movingCounter = BigInt(counter);
  for (let i = 7; i >= 0; i -= 1) {
    counterBuffer[i] = Number(movingCounter & 0xffn);
    movingCounter >>= 8n;
  }

  const hmac = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
};

const verifyTotp = (secret, code, window = 1) => {
  const clean = String(code || "").replace(/\D/g, "");
  if (clean.length !== 6) return false;

  const currentCounter = Math.floor(Date.now() / 30_000);
  const submitted = Buffer.from(clean);

  for (let offset = -window; offset <= window; offset += 1) {
    const candidate = Buffer.from(hotp(secret, currentCounter + offset));
    if (candidate.length === submitted.length && timingSafeEqual(candidate, submitted)) {
      return true;
    }
  }

  return false;
};

const createOtpauthUri = (email, secret) => {
  const label = encodeURIComponent(`${ISSUER}:${email}`);
  const issuer = encodeURIComponent(ISSUER);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
};

const hashPassword = (password, salt = randomBytes(16).toString("hex")) => ({
  salt,
  hash: pbkdf2Sync(password, salt, 210_000, 32, "sha256").toString("hex"),
});

const verifyPassword = (password, salt, hash) => {
  const candidate = hashPassword(password, salt).hash;
  return timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
};

const oneTimeToken = () => randomBytes(32).toString("base64url");

const requireSession = (req) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;

  const session = db
    .prepare(
      `SELECT sessions.token, sessions.expires_at, users.id AS user_id, users.email, users.role
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`
    )
    .get(token);

  if (!session || Date.parse(session.expires_at) < Date.now()) return null;
  return session;
};

const migrate = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'patient',
      totp_secret TEXT,
      totp_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_challenges (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patient_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT NOT NULL,
      blood_group TEXT NOT NULL,
      height_cm INTEGER NOT NULL,
      weight_kg INTEGER NOT NULL,
      primary_condition TEXT NOT NULL,
      allergies TEXT NOT NULL,
      emergency_contact_name TEXT NOT NULL,
      emergency_contact_phone TEXT NOT NULL,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      insurance_id TEXT NOT NULL,
      last_visit TEXT NOT NULL,
      care_team TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      heart_rate INTEGER NOT NULL,
      blood_pressure TEXT NOT NULL,
      glucose_mg_dl INTEGER NOT NULL,
      spo2 INTEGER NOT NULL,
      sleep_score INTEGER NOT NULL,
      stress_level TEXT NOT NULL,
      recorded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      schedule TEXT NOT NULL,
      timing TEXT NOT NULL,
      purpose TEXT NOT NULL,
      safety_note TEXT NOT NULL,
      interaction_risks TEXT NOT NULL,
      adherence_percent INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS medication_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      scheduled_for TEXT NOT NULL,
      taken_at TEXT,
      status TEXT NOT NULL DEFAULT 'due'
    );

    CREATE TABLE IF NOT EXISTS daily_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      lang TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      priority TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS health_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
      record_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      recorded_at TEXT NOT NULL
    );
  `);
};

const seed = () => {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(DEMO_EMAIL);
  if (existing) return;

  const password = hashPassword(DEMO_PASSWORD);
  const userResult = db
    .prepare(
      `INSERT INTO users (email, password_hash, password_salt, role, totp_secret, totp_enabled, created_at)
       VALUES (?, ?, ?, 'patient', ?, 0, ?)`
    )
    .run(DEMO_EMAIL, password.hash, password.salt, generateTotpSecret(), nowIso());

  const patientResult = db
    .prepare(
      `INSERT INTO patient_profiles (
        user_id, full_name, date_of_birth, gender, blood_group, height_cm, weight_kg,
        primary_condition, allergies, emergency_contact_name, emergency_contact_phone,
        preferred_language, insurance_id, last_visit, care_team
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userResult.lastInsertRowid,
      "John Doe",
      "1985-04-12",
      "Male",
      "O+",
      178,
      82,
      "Type 2 diabetes watchlist, controlled blood pressure",
      "Penicillin, shellfish",
      "Maya Doe",
      "+1 415 555 0198",
      "en",
      "HTG-AI-2249-7742",
      "2026-05-29",
      "Dr. Anika Rao, Dr. Miles Chen"
    );

  const patientId = patientResult.lastInsertRowid;
  db.prepare(
    `INSERT INTO vitals (
      patient_id, heart_rate, blood_pressure, glucose_mg_dl, spo2, sleep_score, stress_level, recorded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(patientId, 72, "118/76", 94, 98, 92, "Low", nowIso());

  const medications = [
    [
      "Metformin XR",
      "500 mg",
      "Daily",
      "08:00 with breakfast",
      "Supports glucose control",
      "Take with food to reduce stomach upset.",
      "Avoid heavy alcohol intake; monitor kidney labs during routine visits.",
      96,
    ],
    [
      "Lisinopril",
      "10 mg",
      "Daily",
      "21:00 after dinner",
      "Blood pressure protection",
      "Stand slowly if dizzy; track dry cough symptoms.",
      "Avoid potassium salt substitutes unless clinician approves.",
      93,
    ],
    [
      "Vitamin D3",
      "1000 IU",
      "Daily",
      "12:30 with lunch",
      "Bone and immune support",
      "Best absorbed with a meal containing healthy fat.",
      "No significant interactions in the current medicine list.",
      100,
    ],
    [
      "Atorvastatin",
      "10 mg",
      "Nightly",
      "22:00 before sleep",
      "LDL cholesterol reduction",
      "Report unexplained muscle pain or weakness.",
      "Avoid grapefruit juice; check interactions before new antibiotics.",
      91,
    ],
  ];

  const medInsert = db.prepare(
    `INSERT INTO medications (
      patient_id, name, dosage, schedule, timing, purpose, safety_note, interaction_risks, adherence_percent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const med of medications) medInsert.run(patientId, ...med);

  const suggestions = [
    [
      "en",
      "Medicine",
      "Take morning medicines with breakfast",
      "Metformin XR is due at 08:00. Pair it with food and water, then log the dose.",
      "high",
    ],
    [
      "en",
      "Nutrition",
      "Choose a low-sodium lunch",
      "Your blood pressure trend is stable. Keep lunch under 600 mg sodium and add a fiber-rich side.",
      "medium",
    ],
    [
      "en",
      "Activity",
      "Add a 20-minute walk",
      "A moderate walk after dinner can improve glucose response and sleep quality tonight.",
      "medium",
    ],
    [
      "hi",
      "Medicine",
      "Breakfast ke saath morning medicines lein",
      "Metformin XR 08:00 baje due hai. Isse food aur water ke saath lein, phir dose log karein.",
      "high",
    ],
    [
      "hi",
      "Nutrition",
      "Low-sodium lunch choose karein",
      "Blood pressure trend stable hai. Lunch me sodium kam rakhein aur fiber-rich side add karein.",
      "medium",
    ],
    [
      "te",
      "Medicine",
      "Breakfast tho morning medicines teesukondi",
      "Metformin XR 08:00 ki due. Food mariyu water tho teesukoni dose log cheyandi.",
      "high",
    ],
    [
      "te",
      "Activity",
      "20-minute walk add cheyandi",
      "Dinner tarvata moderate walk glucose response mariyu sleep quality ki help chestundi.",
      "medium",
    ],
    [
      "es",
      "Medicine",
      "Tome sus medicinas de la manana con desayuno",
      "Metformin XR vence a las 08:00. Tomela con comida y agua, luego registre la dosis.",
      "high",
    ],
  ];

  const suggestionInsert = db.prepare(
    `INSERT INTO daily_suggestions (patient_id, lang, category, title, body, priority)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const suggestion of suggestions) suggestionInsert.run(patientId, ...suggestion);

  const records = [
    ["blood_panel", "HbA1c 5.4%, glucose 94 mg/dL, cholesterol borderline at 210 mg/dL.", "2026-05-18T09:30:00.000Z"],
    ["visit_note", "Care team advised medication adherence, walking plan, and sodium reduction.", "2026-05-29T14:00:00.000Z"],
  ];
  const recordInsert = db.prepare(
    "INSERT INTO health_records (patient_id, record_type, summary, recorded_at) VALUES (?, ?, ?, ?)"
  );
  for (const record of records) recordInsert.run(patientId, ...record);
};

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "es", name: "Spanish" },
];

const getDashboard = (userId, lang = "en") => {
  const patient = db
    .prepare("SELECT * FROM patient_profiles WHERE user_id = ?")
    .get(userId);

  if (!patient) return null;

  const vitals = db
    .prepare("SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1")
    .get(patient.id);

  const medications = db
    .prepare("SELECT * FROM medications WHERE patient_id = ? AND active = 1 ORDER BY id")
    .all(patient.id);

  let suggestions = db
    .prepare(
      "SELECT category, title, body, priority FROM daily_suggestions WHERE patient_id = ? AND lang = ? ORDER BY id"
    )
    .all(patient.id, lang);

  if (!suggestions.length && lang !== "en") {
    suggestions = db
      .prepare(
        "SELECT category, title, body, priority FROM daily_suggestions WHERE patient_id = ? AND lang = 'en' ORDER BY id"
      )
      .all(patient.id);
  }

  const records = db
    .prepare("SELECT record_type, summary, recorded_at FROM health_records WHERE patient_id = ? ORDER BY recorded_at DESC")
    .all(patient.id);

  const completedToday = db
    .prepare(
      `SELECT COUNT(*) AS count FROM medication_logs
       JOIN medications ON medications.id = medication_logs.medication_id
       WHERE medications.patient_id = ?
       AND date(medication_logs.scheduled_for) = date('now')
       AND medication_logs.status = 'taken'`
    )
    .get(patient.id).count;

  const medicineCount = medications.length;
  const adherenceAverage = Math.round(
    medications.reduce((sum, med) => sum + med.adherence_percent, 0) / Math.max(medicineCount, 1)
  );

  return {
    patient: {
      id: patient.id,
      fullName: patient.full_name,
      dateOfBirth: patient.date_of_birth,
      gender: patient.gender,
      bloodGroup: patient.blood_group,
      heightCm: patient.height_cm,
      weightKg: patient.weight_kg,
      primaryCondition: patient.primary_condition,
      allergies: patient.allergies.split(",").map((item) => item.trim()),
      emergencyContact: {
        name: patient.emergency_contact_name,
        phone: patient.emergency_contact_phone,
      },
      preferredLanguage: patient.preferred_language,
      insuranceId: patient.insurance_id,
      lastVisit: patient.last_visit,
      careTeam: patient.care_team.split(",").map((item) => item.trim()),
    },
    vitals,
    metrics: {
      healthScore: 88,
      twinSync: 98.4,
      medicineCount,
      adherenceAverage,
      completedToday,
      riskLevel: "Low",
    },
    medications,
    suggestions,
    records,
    languages,
  };
};

const staticFile = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const safePath = normalize(join(publicDir, pathname));
  const rel = relative(publicDir, safePath);

  if (rel.startsWith("..") || rel.includes("..\\")) {
    text(res, 403, "Forbidden");
    return;
  }

  if (!existsSync(safePath)) {
    text(res, 404, "Not found");
    return;
  }

  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
  };
  text(res, 200, readFileSync(safePath), contentTypes[extname(safePath)] || "application/octet-stream");
};

const router = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/health") {
    json(res, 200, { ok: true, service: "HealthTwin Guardian AI", database: dbPath });
    return;
  }

  if (url.pathname === "/api/languages") {
    json(res, 200, { languages });
    return;
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    const body = await parseBody(req);
    if (!body) {
      json(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
      json(res, 401, { error: "Invalid email or password" });
      return;
    }

    let secret = user.totp_secret;
    if (!secret) {
      secret = generateTotpSecret();
      db.prepare("UPDATE users SET totp_secret = ? WHERE id = ?").run(secret, user.id);
    }

    const challengeToken = oneTimeToken();
    db.prepare("DELETE FROM auth_challenges WHERE user_id = ?").run(user.id);
    db.prepare(
      "INSERT INTO auth_challenges (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
    ).run(challengeToken, user.id, expiresIso(10), nowIso());

    json(res, 200, {
      challengeToken,
      user: { id: user.id, email: user.email, role: user.role },
      totp: {
        enabled: Boolean(user.totp_enabled),
        enrollmentRequired: !user.totp_enabled,
        secret: user.totp_enabled ? undefined : secret,
        otpauthUri: user.totp_enabled ? undefined : createOtpauthUri(user.email, secret),
      },
    });
    return;
  }

  if (url.pathname === "/api/auth/totp/verify" && req.method === "POST") {
    const body = await parseBody(req);
    if (!body) {
      json(res, 400, { error: "Invalid JSON body" });
      return;
    }

    const challengeToken = String(body.challengeToken || "");
    const code = String(body.code || "");
    const challenge = db.prepare("SELECT * FROM auth_challenges WHERE token = ?").get(challengeToken);

    if (!challenge || Date.parse(challenge.expires_at) < Date.now()) {
      json(res, 401, { error: "The 2FA challenge expired. Please sign in again." });
      return;
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(challenge.user_id);
    if (!user?.totp_secret || !verifyTotp(user.totp_secret, code)) {
      json(res, 401, { error: "Invalid Google Authenticator code" });
      return;
    }

    db.prepare("UPDATE users SET totp_enabled = 1 WHERE id = ?").run(user.id);
    db.prepare("DELETE FROM auth_challenges WHERE token = ?").run(challengeToken);

    const token = oneTimeToken();
    db.prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .run(token, user.id, expiresIso(60 * 12), nowIso());

    json(res, 200, {
      sessionToken: token,
      user: { id: user.id, email: user.email, role: user.role },
    });
    return;
  }

  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    json(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/dashboard" && req.method === "GET") {
    const session = requireSession(req);
    if (!session) {
      json(res, 401, { error: "Authentication required" });
      return;
    }

    const lang = url.searchParams.get("lang") || "en";
    const dashboard = getDashboard(session.user_id, lang);
    if (!dashboard) {
      json(res, 404, { error: "Patient profile not found" });
      return;
    }

    json(res, 200, dashboard);
    return;
  }

  if (url.pathname.startsWith("/api/medications/") && url.pathname.endsWith("/checkin") && req.method === "POST") {
    const session = requireSession(req);
    if (!session) {
      json(res, 401, { error: "Authentication required" });
      return;
    }

    const medicationId = Number(url.pathname.split("/")[3]);
    const med = db
      .prepare(
        `SELECT medications.id FROM medications
         JOIN patient_profiles ON patient_profiles.id = medications.patient_id
         WHERE medications.id = ? AND patient_profiles.user_id = ?`
      )
      .get(medicationId, session.user_id);

    if (!med) {
      json(res, 404, { error: "Medication not found" });
      return;
    }

    const scheduledFor = new Date().toISOString();
    db.prepare(
      "INSERT INTO medication_logs (medication_id, scheduled_for, taken_at, status) VALUES (?, ?, ?, 'taken')"
    ).run(medicationId, scheduledFor, scheduledFor);

    json(res, 200, { ok: true, medicationId, status: "taken", takenAt: scheduledFor });
    return;
  }

  if (url.pathname === "/api/auth/demo-reset" && req.method === "POST") {
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(DEMO_EMAIL);
    if (user) {
      db.prepare("UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?")
        .run(generateTotpSecret(), user.id);
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
      db.prepare("DELETE FROM auth_challenges WHERE user_id = ?").run(user.id);
    }
    json(res, 200, { ok: true, email: DEMO_EMAIL });
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    json(res, 404, { error: "API route not found" });
    return;
  }

  staticFile(req, res);
};

migrate();
seed();

createServer((req, res) => {
  router(req, res).catch((error) => {
    console.error(error);
    json(res, 500, { error: "Unexpected server error" });
  });
}).listen(port);
