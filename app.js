const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const dbPath = path.join(__dirname, "userData.db");

const app = express();
app.use(express.json());
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("working");
    });
  } catch (e) {
    console.log(`Db Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();
app.get("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const userQuery = `
        SELECT * FROM user `;
  const dbUser = await db.get(userQuery);
  response.send(dbUser);
});

//register
const validatePassword = (password) => {
  return password.length > 4;
};

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const userQuery = `
        SELECT * FROM user WHERE username='${username}';`;
  const dbUser = await db.get(userQuery);
  if (dbUser === undefined) {
    const newUser = `
        INSERT INTO user(username, name, password, gender, location)
        VALUES
         (  '${username}',
            '${name}', 
            '${hashedPassword}',
            '${gender}',
            '${location}');`;
    if (validatePassword(password)) {
      const newUserResp = await db.run(newUser);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
app.get("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  response.send(password);
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userQuery = `
        SELECT *
        FROM user
        WHERE username = '${username}';`;
  const dbUserResp = await db.get(userQuery);
  if (dbUserResp === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const validPassword = await bcrypt.compare(password, dbUserResp.password);
    if (validPassword === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const userQuery = `
        SELECT * FROM user WHERE username = '${username}';`;
  const dbUserResp = await db.get(userQuery);
  const validPassword = await bcrypt.compare(oldPassword, dbUserResp.password);
  if (validPassword === true) {
    if (validatePassword(newPassword)) {
      const hashPassword = await bcrypt.hash(newPassword, 10);
      const updatePassword = `
                UPDATE user
                SET password = '${hashPassword}';`;
      await db.run(updatePassword);
      response.status(200);
      response.send("Password updated");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("Invalid current password");
  }
});
module.exports = app;
