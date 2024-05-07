const database = require("../database/database");
const jwt = require("jsonwebtoken");


const refreshJWTToken = async (request, response) => {
    //проверка на наличие refreshToken'a
    //сначала собираем только куки, ибо если сразу вызвать поле JWT, всё может сломаться
    const cookies = request.cookies;
    if (!cookies.jwt) return response.sendStatus(401);

    //проверка на соответствие REFRESH_TOKEN_SECRET и валидность его payload
    const refreshToken = cookies.jwt;
    let decodedPayload;
    try{
        decodedPayload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        //если херня то доступ запрещён
        if(!(decodedPayload && decodedPayload.user_id)) return response.sendStatus(403);
    } catch (error){
        //проверка на истечение токена
        return response.sendStatus(403);
    }
    //console.log(decodedPayload);

    //проверка на наличие пользователя в базе данных
    const userResponse = await database.simpleSelect("users", {
        columns: ["refresh_token"],
        where: {user_id: decodedPayload.user_id}
    });
    if(userResponse.error) return response.sendStatus(500);//ну базе конец
    //если такого пользователя нет, то всё, пока-пока
    if(userResponse.dataLength === 0) return response.sendStatus(403);//forbidden
    
    //извлекаем инфу
    const userData = userResponse.data[0];
    //проверка на соответствие JWT
    if(userData.refresh_token !== refreshToken) return response.sendStatus(403);//forbidden
    
    //при успешном прохождении всех проверок высылаем новый аксес токен:
    const newAccessToken = jwt.sign(
        {
            "user_id": decodedPayload.user_id
        },
        process.env.ACCESS_TOKEN_SECRET,
        //при тесте - 10с, при продакшене - 10м
        { expiresIn: "10s" }
    );

    response.status(200).json({"accessToken": newAccessToken});
}

module.exports = refreshJWTToken;