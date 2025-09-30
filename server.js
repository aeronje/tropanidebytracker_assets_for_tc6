// web server na may mini ETL engine 
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Pang-iwas hijack sa mga troll farms 👊
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60 // each IP 60 requests per windowMs lang
});
app.use(limiter);

// database environment at saka credentials
const pool = mysql.createPool({
  host: "192.168.137.97",
  user: "donnahp",
  password: "password",
  database: "windy",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// validation helper
function validatePayload(p) {
  const errors = [];
  if (!p.firstName || typeof p.firstName !== 'string' || p.firstName.trim().length === 0) errors.push('firstName');
  if (!p.lastName || typeof p.lastName !== 'string' || p.lastName.trim().length === 0) errors.push('lastName');
  if (!p.contractorCompany || typeof p.contractorCompany !== 'string' || p.contractorCompany.trim().length === 0) errors.push('contractorCompany');
  if (!p.cityofResidence || typeof p.cityofResidence !== 'string' || p.cityofResidence.trim().length === 0) errors.push('cityofResidence');
  if (!p.contactNumber || typeof p.contactNumber !== 'string' || p.contactNumber.trim().length === 0) errors.push('contactNumber');
  return errors;
}

app.post('/submit', async (req, res) => {
  console.log("📩 May dumating na request:", req.body); // <--- para makita agad sa logs

  try {
    const { firstName, lastName, contractorCompany, cityofResidence, contactNumber, jowaName } = req.body;

    // check required fields
    const missing = validatePayload({ firstName, lastName, contractorCompany, cityofResidence, contactNumber });
    if (missing.length) {
      return res.status(400).json({ ok: false, message: 'Parang may mali or invalid fields bhe, paki-check', fields: missing });
    }

    // trim split ends ✂️
    const fName = firstName.trim();
    const lName = lastName.trim();
    const company = contractorCompany.trim();
    const city = cityofResidence.trim();
    const phone = contactNumber.trim();
    const jowa = jowaName && jowaName.trim().length ? jowaName.trim() : null;

    const sql = `INSERT INTO tropa_ni_deby 
      (tropa_first_name, tropa_last_name, tropa_company, tropa_location, tropa_phone, tropa_jowa_name)
      VALUES (?, ?, ?, ?, ?, ?)`;

    const [result] = await pool.execute(sql, [fName, lName, company, city, phone, jowa]);

    console.log("✅ Insert success, ID:", result.insertId);
    return res.json({ ok: true, id: result.insertId, message: 'Inserted' });
  } catch (err) {
    console.error('❌ Insert error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

app.get('/', (req, res) => res.send('Tumatakbo na ang makina ng ETL'));

app.listen(PORT, () => {
  console.log(`🚀 Iyong ETL engine mo bhe ay nakikinig sa port ${PORT}`);
});
