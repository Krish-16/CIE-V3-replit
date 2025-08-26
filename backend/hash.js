const bcrypt = require("bcryptjs");

const plainPassword = "140405"; // change this to whatever you want
bcrypt.hash(plainPassword, 10).then((hash) => {
  console.log("Hashed password:", hash);
});
