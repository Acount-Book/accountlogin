require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const sha = require("sha256");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
// 세션 설정(주로 앞쪽에 작성)
app.use(
  session({
    // 세션 아이디 암호화를 위한 재료 값
    secret: process.env.SESSION_NO,
    // 세션을 접속할 때마다 새로운 세션 식별자(sid)의 발급 여부를 결정. 일반적으로 false로 설정
    resave: false,
    // 세션을 사용하기 전까지 세션 식별자를 발급하지 않도록 함
    saveUninitialized: true,
  })
);

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const URL = process.env.MONGODB_URL;
// mongoDB 연결
// dbName: "account" 실제 데이터 저장할 db명
let mydb;
mongoose
  .connect(URL, { dbName: "db2" })
  .then(() => {
    console.log("MongoDB에 연결");
    mydb = mongoose.connection.db;
  })
  .catch((err) => {
    console.log("MongoDB 연결 실패: ", err);
  });

app.use(express.static(path.join(__dirname, "build")));

// 회원가입
app.post("/signup", async (req, res) => {
  console.log(req.body.userId);
  console.log(req.body.userPw);

  try {
    await mydb.collection("account").insertOne({
      userId: req.body.userId,
      userPw: sha(req.body.userPw),
    });

    console.log("회원가입 성공");
    res.json({ message: "회원가입 성공" });
  } catch (err) {
    console.log("회원가입 에러: ", err);
    res.status(500).send({ error: err });
  }
});

// 로그인
const checkUserSession = (req, res) => {
  if (req.session.user) {
    console.log("세션 유지");
    res.json({ user: req.session.user });
  } else {
    res.json({ user: null });
  }
};

app.get("/login", checkUserSession);
app.get("/", checkUserSession);

app.post("/login", async (req, res) => {
  const { userId, userPw } = req.body;
  console.log("id: ", userId);
  console.log(`pw: ${userPw}`);

  try {
    const result = await mydb.collection("account").findOne({ userId });

    if (!result) {
      return res.json({ err: "아이디를 찾을 수 없습니다" });
    } else if (result.userPw && result.userPw === sha(userPw)) {
      req.session.user = { userId, userPw };
      console.log("새로운 로그인");
      res.json({ user: req.session.user });
    } else {
      return res.json({ err: "비밀번호가 틀렸습니다" });
    }
  } catch (err) {
    console.log("로그인 에러 : ", err);
    res.status(500).json({ err: "서버 오류" });
  }
});

// 로그아웃
app.get("/logout", (req, res) => {
  console.log("로그아웃");
  req.session.destroy();

  res.json({ user: null });
});

app.listen(PORT, () => {
  console.log("8080번 포트에서 실행 중");
});
