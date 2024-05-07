const database = require("../database/database");

/*
*
*   request.body = {
*       coursePath: string, (db media_path)
*       chapterPath: string, (db media_path)
*       answers: string
*   }
*      
*/ 

const handleExamination = async (request, response) => {
    /*const coursePath: string = request.body.coursePath;
    const chapterPath: string = request.body.chapterPath;
    const answers: string = request.body.answers;
    const userID: number = request.body.user_id;*/
    //console.log(request.body);
    const {coursePath, chapterPath, answers, user_id} = request.body;

    if (!coursePath || !chapterPath || !answers) return response.status(404).json({"reason":"invalid request body"});
    
    let correctAnswers;
    let chapter_id;
    try{
        const databaseQuery = await database.pool.query(`
            SELECT chapter_id, answers FROM chapters WHERE 
            course_id = (SELECT course_id FROM courses WHERE media_path = '${coursePath}') AND
            media_path = '${chapterPath}';
        `);

        if (databaseQuery.rowCount !== 1) return response.status(500).json({"reason":"Извините, неожиданные неполадки на сервере :("});

        correctAnswers = databaseQuery.rows[0].answers;
        chapter_id = databaseQuery.rows[0].chapter_id;
    } catch (error) {
        return response.status(500).json({"reason":"Извините, неожиданные неполадки на сервере :("});
    }

    if (answers.length === correctAnswers.length) {
        let result = new Array(answers.length);
        let sum = 0;

        for(let i = 0; i < answers.length; i++) {
            let correct = (answers[i] === correctAnswers[i]) ? 1 : 0;
            result[i] = correct;
            sum += correct;
        }

        const percentage = Math.trunc((sum / answers.length) * 100);
        response.status(200).json({"result":result,"correct":sum,"total":answers.length,"percentage":percentage});
        
        const updateChapterProgressQuery = `
            INSERT INTO chapters_progress (user_id, chapter_id, progress, course_id)
            VALUES (${user_id}, 
                    ${chapter_id}, 
                    ${percentage}, 
                    (SELECT course_id FROM chapters WHERE chapter_id = ${chapter_id})) 
            ON CONFLICT (user_id, chapter_id) DO UPDATE SET progress = EXCLUDED.progress;
        `;
        database.pool.query(updateChapterProgressQuery).catch((error) => console.log(error));
    } else {
        //если длины ответов и вопросов не совпадат то то какой-то ужас
        return response.status(500).json({"reason":"Извините, неожиданные неполадки на сервере :("});
    }
}

module.exports = handleExamination;