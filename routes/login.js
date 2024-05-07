const database = require("../database/database");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const handleLogin = async (request, response) => {
    const {username, password} = request.body;
    if (!username || !password) return response.status(400).json({"message":"username and password are required"});//bad request

    const user = await database.simpleSelect("users", {
        columns: ["user_id", "username", "password"],
        where: {username: username}
    });
    //если запрос в БД завершился с ошикой, то 500
    if(user.status === 400) return response.status(500).json({"message":"database error"});//Internal server error

    console.log(user);
    //Если пользователь с таким логином не найден или пароли не совпадают то 401
    if(user.dataLength === 0) return response.sendStatus(401);//unathorized
    //Вытаскиваем данные из ответа БД
    const userData = user.data[0];
    if(userData.password !== password) return response.sendStatus(401);//unathorized
    
    //если не дропнуло никакую ошибку, то значит всё кайфово и можно идти дальше
    const accessToken = jwt.sign(
        //payload
        {
            "user_id": userData.user_id
        },
        //ключ шифрования
        process.env.ACCESS_TOKEN_SECRET,
        //для тестирования - 10s, для продакшена - 30m
        { expiresIn: "10s" }
    );

    const refreshToken = jwt.sign(
        //payload
        {
            "user_id": userData.user_id
        },
        //ключ шифрования
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "12h" }
    )

    const updateJWTResponse = await database.updateJWT(userData.user_id, refreshToken);
    if (updateJWTResponse.status === 400) return response.status(500).json({"message":"database error"});//Internal server error

    //Присоединяем к ответу рефреш токен в http-only куки и отправляем аксес токен в теле
    response.cookie("jwt", refreshToken, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        //cтавить таким же, как в refreshToken.expiresIn
        maxAge: 12 * 60 * 60 * 1000
    });
    response.status(200).json({accessToken});//OK
}

module.exports = handleLogin;