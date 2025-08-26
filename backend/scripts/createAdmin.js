/* Usage:
   node scripts/createAdmin.js --id <adminId> --password <password>
*/
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/";
const DB_NAME = process.env.DB_NAME || "cie";

function parseArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

(async () => {
  const adminId = parseArg("id");
  const password = parseArg("password");
  if (!adminId || !password) {
    console.error("Provide --id and --password");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  try {
    const existing = await Admin.findOne({ adminId });
    if (existing) {
      console.log("Admin already exists:", adminId);
      process.exit(0);
    }
    const hashed = await bcrypt.hash(password, 10);
    await Admin.create({ adminId, password: hashed });
    console.log("Admin created:", adminId);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
