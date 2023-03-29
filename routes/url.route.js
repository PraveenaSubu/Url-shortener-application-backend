import express from "express";
import ShortUniqueId from "short-unique-id";
import { auth } from "../middlewares/auth.js";
import {
    findLURL,
    getLURL,
    getThisMonthURLs,
    getTodayURLs,
    getURLsFromID,
    getUserFromToken,
    storeUrlInDB,
} from "../services/user.service.js";
const router = express.Router();

router.post("/create", auth, async function (request, response) {
    const { lUrl } = request.body;
    // console.log("url is", lUrl); //if url already there in short give the existing
    const urlObj = await findLURL(lUrl);
    if (urlObj) {
        response
            .status(400)
            .send({ message: "this Url already exist", shortStr: urlObj.shortStr });
    } else {
        const uid = new ShortUniqueId({ length: 10 });
        // console.log("received token is", request.headers.logintoken);
        const shortStr = uid();
        // console.log("short url is", shortStr);
        const { user_id } = await getUserFromToken(request.headers.logintoken);
        // console.log("user obj is", user);
        // console.log("user id is", user_id);
        await storeUrlInDB({
            shortStr: shortStr,
            lUrl: lUrl,
            clickedCount: 0,
            generatedBy: user_id,
        });
        response.send({
            message: "Short URL generated Successfully",
            newData: { shortStr: shortStr, lUrl: lUrl },
        });
    }
});

router.get("/getAllUrls", auth, async function (request, response) {
    const token = request.headers.logintoken;
    // console.log("done rrr");
    const { user_id } = await getUserFromToken(token);

    const urls = await getURLsFromID(user_id);
    // console.log("gtUsername user", user);
    if (urls.length > 0) {
        response.send({ message: "list urls found", newData: urls });
    } else {
        response.status(400).send({ message: "no urls found" });
    }
});

router.get("/getStats", auth, async function (request, response) {
    const token = request.headers.logintoken;
    // console.log("got called in ser");
    const user = await getUserFromToken(token);
    const { user_id } = user;

    const todayUrlsCount = await getTodayURLs(user_id);
    const monthUrlsCount = await getThisMonthURLs(user_id);
    // const thisMonthUrlsCount = await getThisMonthURLsCount(user_id);
    // console.log("count todays", todayUrlsCount);
    // console.log("count months", monthUrlsCount);
    if (user) {
        response.send({
            message: "user found",
            todayCount: todayUrlsCount,
            monthCount: monthUrlsCount,
        });
    } else {
        response.status(400).send({ message: "no user record" });
    }
});

export default router;