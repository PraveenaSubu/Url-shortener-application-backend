import express from "express";
import urlRouter from "./routes/url.route.js";
import { MongoClient } from "mongodb";
import {
    addUser,
    getUserFromDB,
    getUserFromDBByUserName,
    storeResetTokenInDB,
    getUserFromResetToken,
    getUserFromID,
    updatePasswordInDB,
    getUserFromDBbyEmail,
    storeLoginToken,
    getUserFromToken,
    getLURL,
} from "./services/user.service.js";
import bcrypt from "bcrypt";
import cors from "cors";
import * as dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { auth } from "./middlewares/auth.js";

const app = express();
const PORT = process.env.PORT;
app.use(express.json());
app.use(cors());
//mongo connection

const MONGO_URL = process.env.MONGO_URL;
export const client = new MongoClient(MONGO_URL);
client.connect();
console.log("mongo connected");

app.listen(PORT, () => console.log("app started in PORT", PORT));

app.get("/", function (request, response) {
    response.send("welcome to url shorten api");
});

async function generateHashedPassword(plainPassword) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    return hashedPassword;
}

function checkDataValid(data) {
    const { password, mobile, email, age, name } = data;
    const valid =
        email.length > 8 &&
            password.length > 7 &&
            mobile.length > 9 &&
            age > 11 &&
            name.length > 2
            ? true
            : false;
    return valid;
}
app.post("/signup", async function (request, response) {
    const data = request.body;
    const userfromDB = await getUserFromDBbyEmail(data);
    if (userfromDB) {
        response.status(400).send({ message: "already user exist on this email" });
    } else {
        const isValidData = checkDataValid(data);
        if (isValidData) {
            const formattedData = {
                ...data,
                isActivated: false,
                password: await generateHashedPassword(data.password),
            };
            const result = await addUser(formattedData);
            response.status(201).send({
                message:
                    "Signup Success Active the Login by using Activation Link sent in Email",
            });
        } else {
            response
                .status(400)
                .send({ message: "info doesn't pass the input field rules" });
        }
    }
});

app.post("/login", async function (request, response) {
    const data = request.body;
    const userfromDB = await getUserFromDBbyEmail(data);
    if (userfromDB) {
        const isPasswordMatch = await bcrypt.compare(
            data.password,
            userfromDB.password
        );
        // console.log("is pass match", isPasswordMatch);
        if (isPasswordMatch) {
            const logintoken = jwt.sign(
                { id: userfromDB._id },
                process.env.SECRET_KEY
            );
            await storeLoginToken({ user_id: userfromDB._id, token: logintoken });
            response
                .status(200)
                .send({ message: "User Login Successfull", token: logintoken });
        } else {
            response.status(401).send({ message: "Invalid Credentials" });
        }
    } else {
        response.status(400).send({ message: "Invalid Credentials." });
    }
});

app.post("/forgot-password", async function (request, response) {
    const data = request.body;
    const userfromDB = await getUserFromDBbyEmail(data);
    if (userfromDB) {
        response
            .status(200)
            .send({ message: "Click on Reset Password to send an email" });
    } else {
        response
            .status(400)
            .send({ message: "Invalid Credentials. try registration first" });
    }
});

//node mailer

// async..await is not allowed in global scope, must use a wrapper
async function mailer(userResetInfo) {
    // console.log("user reset info", userResetInfo);
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        service: "gmail", //intead port use service gmail
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL, //  gmail user id
            pass: process.env.PASS, // generated gmail app password
        },
    });
    // send mail with defined transporter object
    const url = `${process.env.API_CLIENT}/change-password/${userResetInfo.resetToken}`;
    let info = await transporter.sendMail({
        from: '"URL Shortener 👻" <sivaraj2siva@gmail.com>', // sender address
        to: `${userResetInfo.email}`, // list of receivers
        subject: "Password Reset for url shortener App", // Subject line
        text: `Hi ${userResetInfo.name}, as you have requested to reset Password, this is the link please click and reset. ${url}`, // plain text body
        html: `<div > <p>Hi ${userResetInfo.name} as you have requested to reset Password, this is the link please click and reset.  ${url} </p> <b>forgot? click this link to reset</b> <a href=${url} target="_blank">Reset Password</a></div>`, // html body
    });
    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
}
// mailer().catch(console.error); //function call

async function generateToken(userfromDB) {
    const token = jwt.sign(
        { id: userfromDB._id, time: Date.now() },
        process.env.SECRET_KEY
    );
    return token;
}
app.post("/sendResetLink", async function (request, response) {
    const data = request.body;
    const userfromDB = await getUserFromDBbyEmail(data);
    if (userfromDB) {
        const resetToken = await generateToken(userfromDB);
        // console.log("TOKEN", token);
        await storeResetTokenInDB({
            user_id: userfromDB._id,
            resetToken: resetToken,
        });

        const userResetInfo = { ...userfromDB, resetToken: resetToken };
        await mailer(userResetInfo).catch(console.error);
        response.status(200).send({
            message: "Click on Reset Password link has been sent to your email",
        });
    } else {
        response
            .status(400)
            .send({ message: "Invalid Credentials. try registration first" });
    }
});

app.get("/change-password", async function (request, response) {
    const resetTokenFromFront = request.headers.resettoken;
    // console.log("resetTokenFromFront", resetTokenFromFront);
    const userFromDB = await getUserFromResetToken(resetTokenFromFront);
    // console.log("forgotUserfromDB", userFromDB);
    if (userFromDB) {
        const user = await getUserFromID(userFromDB.user_id);
        // console.log("user", user);
        response.send({
            message: "user Found being redirected to ResetPage",
            email: user.email,
        });
    } else {
        response
            .status(400)
            .send({ message: "Invalid Credentials. try registration first" });
    }
});

app.post("/change-password", async function (request, response) {
    const resetTokenFromFront = request.headers.resettoken;
    const values = request.body;
    // console.log("resetTokenFromFront", resetTokenFromFront);
    // console.log("values from front", values);
    const tokendedUserFromDB = await getUserFromResetToken(resetTokenFromFront);
    // console.log("forgotUserfromDB", tokendedUserFromDB);
    const tokenedUser = await getUserFromID(tokendedUserFromDB.user_id);
    // const isUserAndTokenVerified = verfiyUserAndToken(values,tokenedUser);
    if (tokenedUser.email === values.email) {
        // console.log("request valid");
        if (values.password === values.cpassword) {
            const hashedNewPassword = await generateHashedPassword(values.password);
            await updatePasswordInDB(tokenedUser.email, hashedNewPassword);
            response.send({
                message: "Password Change Success",
            });
        } else {
            response.status(400).send({
                message: "Password and confirm password should be same",
            });
        }
    } else {
        response.status(400).send({ message: "Unauthorised usage" });
    }
});

app.get("/getUsername", auth, async function (request, response) {
    const token = request.headers.logintoken;
    // console.log("gtUsername token is", token);
    const { user_id } = await getUserFromToken(token);
    // console.log("gtUser Id is", user_id);
    const user = await getUserFromID(user_id);
    console.log("1 gtUsername user", user);
    if (user) {
        response.send({ message: "userfound", name: user.name });
    } else {
        response.status(400).send({ message: "Unauthorised user" });
    }
});

app.get("/getLengthUrl", async function (request, response) {
    const shortStr = request.headers.shortstr;
    console.log("short str in server req is", shortStr);
    const urlObj = await getLURL(shortStr);
    // console.log("url obj is", urlObj);

    if (urlObj) {
        response.send({ message: "url found", lenghURL: urlObj.lUrl });
    } else {
        response.status(400).send({ message: "url not found" });
    }
});
app.use("/url", auth, urlRouter);