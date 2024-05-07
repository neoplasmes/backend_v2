const jwt = require("jsonwebtoken");
require("dotenv").config();


const verifyJWTWeak = async (request, response, next) => {
    //слабая проверка - проверка только на наличие refreshToken'a
    //используется для предоставления данных, которые могут быть как персонализированны, так и нет 
    //(ну например в вк можно отправить просто посты паблика, а можно отправить посты с информацией о твоих лайках)
    //сначала собираем только куки, ибо если сразу вызвать поле JWT, всё может сломаться
    const cookies = request.cookies;
    if (!cookies.jwt) return next();//unathorized -> просто идём дальше

    //проверка на соответствие REFRESH_TOKEN_SECRET и валидность его payload
    const refreshToken = cookies.jwt;
    let decodedPayload;
    try{
        decodedPayload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        //Если какая-то херня с декодированной информацией, то просто идём дальше, информация всё равно публичная
        if(!(decodedPayload && decodedPayload.user_id)) return next();

        //Если всё нормально, то добавляем поле user_id во входящий запрос и идём дальше (return next())
        request.body.user_id = decodedPayload.user_id;
        return next();
    } catch (error){
        //catch вызовется только в случае истечения токена (ну а может и в случае подделки я хз)
        //Если токен истёк, то просто идём дальше и возвращаем не персонализированную информацию
        return next();
    }
}


const verifyJWTMedium = async (request, response, next) => {
    //средняя проверка - проверка только на наличие refreshToken'a
    //используется для предоставления данных, которые являются персонализированными, но не конфиденциальными
    //те компоненты во фронтенде, которые получат отсюда unathorized должны выкинуть пользователя на релогин
    //сначала собираем только куки, ибо если сразу вызвать поле JWT, всё может сломаться
    const cookies = request.cookies;
    if (!cookies.jwt) return response.sendStatus(401);//unathorized

    //проверка на соответствие REFRESH_TOKEN_SECRET и валидность его payload
    const refreshToken = cookies.jwt;
    let decodedPayload;
    try{
        decodedPayload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        //какая-то херня с декодированной информацией
        if(!(decodedPayload && decodedPayload.user_id)) return response.sendStatus(403); //доступ запрещён

        //Если всё нормально, то добавляем поле user_id во входящий запрос и идём дальше (return next())
        request.body.user_id = decodedPayload.user_id;
        return next();
    } catch (error){
        //catch вызовется только в случае истечения токена (ну а может и в случае подделки я хз)
        //Если токен истёк, то просто идём дальше и возвращаем не персонализированную информацию
        return response.sendStatus(403);//доступ запрещён (forbidden)
    }
} 



const verifyJWTStrong = async (request, response, next) => {
    //используется для проверки доступа к конфиденциальной информации и конфиденциальным действиям
    //со стороны клиента в запросе должен быть установлен заголовок "Authorization" со значением "Bearer Access_Token"
    //Bearer - предъявитель с англ.
    const authHeader = request.headers["authorization"];
    if (!authHeader) return response.sendStatus(401);//unathorized

    jwt.verify(
        authHeader.split(" ")[1],
        process.env.ACCESS_TOKEN_SECRET,
        (error, decodedPayload) => {
            if (error) return response.sendStatus(403);//forbidden

            if(!(decodedPayload && decodedPayload.user_id)) return response.sendStatus(403); //доступ запрещён

            //Если всё нормально, то добавляем поле user_id во входящий запрос и идём дальше (return next())
            request.body.user_id = decodedPayload.user_id;
            return next();
        }
    )
} 

module.exports = {
    verifyJWTWeak,
    verifyJWTMedium,
    verifyJWTStrong
}