const database = require("../database/database");

const handleNewUser = async (request, response) => {
    console.log(request.body);
    const {username, password} = request.body;
    if (!username || !password) return response.status(400).json({"message":"username and password are required"});

    const alreadyExist = await database.simpleSelect("users", {columns: ["user_id"], where: {username: username}})
    if (alreadyExist.status === 400) return response.status(500).json({"message": "database is down"});//internal server error
    if (alreadyExist.dataLength > 0) return response.status(409).json({"message": "user already exist"});//conflict with data on the server

    const databaseQuery = `INSERT INTO users (username, password) VALUES ('${username}','${password}')`;
    database.pool.query(databaseQuery)
    .then(() => {
        return response.status(201).json({"message":`user ${username} created`});
    })
    .catch((error) => {
        console.log(error);
        response.status(500).json({"message": "database is down"});
    })
}

module.exports = handleNewUser;