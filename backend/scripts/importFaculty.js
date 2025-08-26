const mongoose = require("mongoose");
const Faculty = require("../models/Faculty"); // Adjust the path if needed
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/";
const DB_NAME = process.env.DB_NAME || "cie";

// Full faculty data (parsed from your text)
const faculties = [
  // DCE Department
  { facultyId: "DCEHOD", name: "Chirag Patel", department: "DCE" },
  { facultyId: "DCE001", name: "Bhavika Patel", department: "DCE" },
  { facultyId: "DCE002", name: "Binal Kaka", department: "DCE" },
  { facultyId: "DCE003", name: "Jay Patel", department: "DCE" },
  { facultyId: "DCE004", name: "Kajal Parmar", department: "DCE" },
  { facultyId: "DCE005", name: "Kashyap Patel", department: "DCE" },
  { facultyId: "DCE006", name: "Khushi Patel", department: "DCE" },
  { facultyId: "DCE007", name: "Neeta Chudasama", department: "DCE" },
  { facultyId: "DCE008", name: "Premal Patel", department: "DCE" },
  { facultyId: "DCE009", name: "Sachi Joshi", department: "DCE" },
  { facultyId: "DCE010", name: "Sandeep Mehta", department: "DCE" },
  { facultyId: "DCE011", name: "Sudheesh Patel", department: "DCE" },
  { facultyId: "DCE012", name: "Urvashi Chaudhari", department: "DCE" },

  // DIT Department
  { facultyId: "DITHOD", name: "Dweepna Garg", department: "DIT" },
  { facultyId: "DIT001", name: "Akash Patel", department: "DIT" },
  { facultyId: "DIT002", name: "Ashish Katira", department: "DIT" },
  { facultyId: "DIT003", name: "Chintal Raval", department: "DIT" },
  { facultyId: "DIT004", name: "Dipika Damodar", department: "DIT" },
  { facultyId: "DIT005", name: "Hardik Jayswal", department: "DIT" },
  { facultyId: "DIT006", name: "Hitesh Makwana", department: "DIT" },
  { facultyId: "DIT007", name: "Pooja Singh Chaudhary", department: "DIT" },
  { facultyId: "DIT008", name: "Radhika Patel", department: "DIT" },
  { facultyId: "DIT009", name: "Rajesh Patel", department: "DIT" },
  { facultyId: "DIT010", name: "Ritika Jani", department: "DIT" },
  { facultyId: "DIT011", name: "Sachin Patel", department: "DIT" },

  // DCS Department
  { facultyId: "DCSHOD", name: "Amit Nayak", department: "DCS" },
  { facultyId: "DCS001", name: "Arpit Bhatt", department: "DCS" },
  { facultyId: "DCS002", name: "Bansari Patel", department: "DCS" },
  { facultyId: "DCS003", name: "Dipak Ramoliya", department: "DCS" },
  { facultyId: "DCS004", name: "Disha Panchal", department: "DCS" },
  { facultyId: "DCS005", name: "Gaurang Patel", department: "DCS" },
  { facultyId: "DCS006", name: "Hardik Parmar", department: "DCS" },
  { facultyId: "DCS007", name: "Kirti Makwana", department: "DCS" },
  { facultyId: "DCS008", name: "Krishna Patel", department: "DCS" },
  { facultyId: "DCS009", name: "Mohini Darji", department: "DCS" },
  { facultyId: "DCS010", name: "Naina Parmar", department: "DCS" },
  { facultyId: "DCS011", name: "Nilesh Dubey", department: "DCS" },
  { facultyId: "DCS012", name: "Parth Goel", department: "DCS" },
  { facultyId: "DCS013", name: "Priyanka Padhiyar", department: "DCS" },
  { facultyId: "DCS014", name: "Vaishali Vadhavana", department: "DCS" },
];

async function importFaculties() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    // Optional: uncomment to start fresh
    // await Faculty.deleteMany({});

    for (const fac of faculties) {
      await Faculty.updateOne(
        { facultyId: fac.facultyId },
        { $set: { name: fac.name, department: fac.department } },
        { upsert: true }
      );
      console.log(`Upserted faculty: ${fac.facultyId} (${fac.department})`);
    }

    console.log("All faculties imported successfully with departments!");
    process.exit(0);
  } catch (err) {
    console.error("Error importing faculties:", err);
    process.exit(1);
  }
}

importFaculties();
