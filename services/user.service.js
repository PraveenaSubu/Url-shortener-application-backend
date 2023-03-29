import { client } from "../index.js";

export async function addUser(data) {
    return await client
        .db("urlShortenerTask")
        .collection("users")
        .insertOne(data);
}

export async function getUserFromDB(data) {
    const { email } = data;
    return await client
        .db("urlShortenerTask")
        .collection("users")
        .findOne({ email });
}

export async function getUserFromDBbyEmail(data) {
    const { email } = data;
    return await client
        .db("urlShortenerTask")
        .collection("users")
        .findOne({ email: email.toLowerCase() });
}

export async function getUserFromDBByUserName(data) {
    const { username } = data;
    return await client
        .db("urlShortenerTask")
        .collection("users")
        .findOne({ username });
}

export async function storeResetTokenInDB(data) {
    return await client
        .db("urlShortenerTask")
        .collection("usersResetTokens")
        .insertOne({ ...data, createdAt: Date.now() });
}

export async function getUserFromResetToken(urlData) {
    return await client
        .db("urlShortenerTask")
        .collection("usersResetTokens")
        .findOne({ resetToken: urlData });
}

export async function getUserFromID(id) {
    // console.log(" got id in getUserFromID", id);
    return await client
        .db("urlShortenerTask")
        .collection("users")
        .findOne({ _id: id });
}

export async function updatePasswordInDB(email, newpassword) {
    return await client
        .db("urlShortenerTask")
        .collection("users")
        .updateOne({ email }, { $set: { password: newpassword } });
}

export async function storeLoginToken(data) {
    return await client
        .db("urlShortenerTask")
        .collection("usersLoginTokens")
        .insertOne({ ...data, createdAt: Date.now() });
}

export async function getUserFromToken(token) {
    return await client
        .db("urlShortenerTask")
        .collection("usersLoginTokens")
        .findOne({ token: token });
}

export async function storeUrlInDB(data) {
    const { shortStr, lUrl, generatedBy: user_id } = data;
    const formattedData = { ...data, createdAt: new Date() };
    return await client
        .db("urlShortenerTask")
        .collection("urls")
        .insertOne(formattedData);
}

export async function findLURL(lUrl) {
    return await client
        .db("urlShortenerTask")
        .collection("urls")
        .findOne({ lUrl: lUrl });
}

export async function getLURL(shortStr) {
    // console.log("ren");
    let count = await client
        .db("urlShortenerTask")
        .collection("urls")
        .findOne({ shortStr: shortStr });
    // console.log("from count", count);
    // console.log("1");
    await client
        .db("urlShortenerTask")
        .collection("urls")
        .updateOne(
            { shortStr: shortStr },
            { $set: { clickedCount: count.clickedCount + 1 } }
        );
    return await client
        .db("urlShortenerTask")
        .collection("urls")
        .findOne({ shortStr: shortStr });
}

export async function getURLsFromID(id) {
    return await client
        .db("urlShortenerTask")
        .collection("urls")
        .find({ generatedBy: id })
        .toArray();
}

export async function getTodayURLs(id) {
    const startDateStr = new Date().toDateString();
    const endDateStr = new Date(
        new Date(startDateStr).getTime() + 86400000
    ).toDateString();
    // console.log("db query calling");
    // console.log(new Date(startDateStr), new Date(endDateStr));

    return await client
        .db("urlShortenerTask")
        .collection("urls")
        .count({
            generatedBy: id,
            $and: [
                { createdAt: { $gte: new Date(startDateStr) } },
                { createdAt: { $lt: new Date(endDateStr) } },
            ],
        });
}

export async function getThisMonthURLs(id) {
    const date = new Date();
    const [day, month, year] = [
        date.getDate(),
        date.getMonth(),
        date.getFullYear(),
    ];
    const startDate = new Date(`${year}-${month + 1}-${1}`);
    const endDate = new Date(`${year}-${month + 2}-${1}`);

    return await client
        .db("urlShortenerTask")
        .collection("urls")
        .find({
            generatedBy: id,
            $and: [
                { createdAt: { $gte: startDate } },
                { createdAt: { $lt: endDate } },
            ],
        })
        .count();
} 