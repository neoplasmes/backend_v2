DROP TABLE IF EXISTS chapters;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS courses_progress;
DROP TABLE IF EXISTS chapters_progress;
/*Создание таблиц*/
create table users(
	user_id serial primary key,
	username varchar(100) UNIQUE NOT NULL,
	password  varchar(100) NOT NULL,
	refresh_token varchar(256) DEFAULT NULL,
);

create table courses(
	course_id serial primary key,
	course_name varchar(256) not NULL,
	description varchar(1024),
	media_path varchar(256) UNIQUE NOT NULL,
	chapters_amount int NOT NULL default 1
);

create table chapters(
	chapter_id serial primary key,
	course_id int not NULL references courses (course_id) ON DELETE CASCADE,
	chapter_name varchar(256) not NULL,
	media_path varchar(256) not NULL,
	answers varchar(64) not NULL default '00000000',
	has_test BOOLEAN NOT NULL default TRUE
);

create table courses_progress(
	user_id int not NULL references users (user_id) ON DELETE CASCADE,
	course_id int not NULL references courses (course_id) ON DELETE CASCADE,
	progress int not NULL default 0,
	PRIMARY KEY (user_id, course_id)
);

create table chapters_progress(
	user_id int not NULL references users (user_id) ON DELETE CASCADE,
	chapter_id int not NULL references chapters (chapter_id) ON DELETE CASCADE,
	course_id int not null references courses (course_id) ON DELETE CASCADE,
	progress int not NULL default 0,
	PRIMARY KEY (user_id, chapter_id)
);

/*
*	
*	Триггер, автоматически оновленющий поле progress в courses_progress
*	courses_progress[user_id][course_id].progress = 
*		  |			(chapter_progress1[user_id][course_id] + chapter_progress2 + ... chapter_progressN) / (N = courses[course_id].chapters_amount);
*		  -- course_id ------------------------>
*/

CREATE OR REPLACE FUNCTION update_course_progress() RETURNS TRIGGER AS
$$
DECLARE
	new_course_progress INT;
	updated_course_reducer INT;
BEGIN
	SELECT chapters_amount FROM courses INTO updated_course_reducer
	WHERE courses.course_id = NEW.course_id;

	SELECT SUM(progress) / updated_course_reducer FROM chapters_progress AS ch INTO new_course_progress 
	WHERE ch.user_id=NEW.user_id AND ch.course_id=NEW.course_id;
	
	INSERT INTO courses_progress (user_id, course_id, progress)
		VALUES (NEW.user_id, NEW.course_id, new_course_progress)
	ON CONFLICT (user_id, course_id) DO
		UPDATE SET progress = EXCLUDED.progress;
	RETURN new;
END;
$$
LANGUAGE 'plpgsql';

/*Возможно на delete будет пиздец*/
CREATE OR REPLACE trigger update_course_progress_trigger
AFTER INSERT OR UPDATE OR DELETE ON chapters_progress FOR EACH ROW
EXECUTE PROCEDURE update_course_progress();


/*Стартовые значения*/
INSERT INTO courses (course_name, description, media_path, chapters_amount)
VALUES ('Обучение фотографии', 'В этом курсе вы научитесь фотографировать', 'photography', 8);

INSERT INTO chapters(course_id, chapter_name, media_path, answers, order_id, has_test)
	VALUES 
		(1, 'Введение', 'introduction', '', 1, FALSE),
		(1, 'История появления и развития фотографии', '1', '12311121', 2, TRUE),
		(1, 'Что из себя представляет фотоаппарат', '2', '33212223', 3, TRUE),
		(1, 'Что из себя представляет оптика', '3', '31131212', 4, TRUE),
		(1, 'ISO, выдержка и диафрагма', '4', '13321221', 5, TRUE),
		(1, 'Композиция, ракурсы и планы', '5', '22312312', 6, TRUE),
		(1, 'Необычные методы и советы', '6', '11231312', 7, TRUE),
		(1, 'Кради как художник. Источники вдохновения и референсы', '7', '', 8, FALSE),
		(1, 'Советы по постоработке', '8', '21311', 9, TRUE),
		(1, 'Эпилог', 'epilogue', '', 10, FALSE);



/*Функция персонализированной информации по курсам*/
CREATE OR REPLACE FUNCTION personalized_courses_data(entered_id int)
RETURNS TABLE (course_id int, course_name varchar, description varchar, media_path varchar, progress int) AS
$$
	BEGIN
		RETURN QUERY
			SELECT
				courses.course_id, courses.course_name, courses.description, courses.media_path,
				coalesce(courses_progress.progress, 0) AS progress
			FROM courses
			LEFT JOIN (
				SELECT
					courses_progress.course_id,
					courses_progress.progress
				FROM courses_progress
				WHERE courses_progress.user_id = entered_id
			) AS courses_progress
			ON courses.course_id = courses_progress.course_id;
	END
$$ LANGUAGE 'plpgsql';


/*Функция персонализированной информации по главам*/
CREATE OR REPLACE FUNCTION personalized_chapters_data(entered_id int, entered_media_path varchar)
RETURNS TABLE (chapter_id int, order_id int, chapter_name varchar, media_path varchar, has_test boolean, progress int) AS
$$
	BEGIN
		RETURN QUERY
			SELECT
				chapters.chapter_id, chapters.order_id, chapters.chapter_name, chapters.media_path, chapters.has_test,
				coalesce(chapters_progress.progress, 0) AS progress
			FROM 
				(SELECT * FROM chapters 
				/*вот этот кусок выберет ID по media_path курса*/
				WHERE chapters.course_id = (SELECT courses.course_id FROM courses WHERE courses.media_path = entered_media_path)) AS chapters
				
				LEFT JOIN 
				/*этот подзапрос возвращает прогрессы всех глав курса*/
					(SELECT
						chapters_progress.chapter_id,
						chapters_progress.progress
					FROM chapters_progress
					WHERE chapters_progress.user_id = entered_id) AS chapters_progress
				ON chapters.chapter_id = chapters_progress.chapter_id
			ORDER BY chapters.order_id;
	END
$$ LANGUAGE 'plpgsql';

