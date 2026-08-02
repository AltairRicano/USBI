const crypto = require('crypto');
const fs = require('fs');

function uuid() {
  return crypto.randomUUID();
}

const sections = [
  { title: "Psicología", color: "#FF5733" },
  { title: "Deportes", color: "#33FF57" },
  { title: "Cultura general", color: "#3357FF" }
];

const templateTypes = ["trivia", "crossword", "memory", "word_search", "puzzle", "fake_news", "snakes_ladders"];

function generateContent(templateType, sectionTitle) {
  if (templateType === "trivia") {
    return [
      {
        question: `Pregunta de trivia sobre ${sectionTitle}?`,
        options: ["A", "B", "C", "D"],
        correct_index: 0
      }
    ];
  } else if (templateType === "puzzle") {
    return {
      phrase: `Rompecabezas de ${sectionTitle}`,
      pieces: 3
    };
  } else if (templateType === "word_search") {
    return {
      words: ["UNO", "DOS", "TRES", "CUATRO"].map(w => w + sectionTitle.substring(0, 3).toUpperCase()),
      width: 10,
      height: 10
    };
  } else if (templateType === "fake_news") {
    return {
      news: [
        {
          title: `Noticia sobre ${sectionTitle}`,
          content: "Este contenido es falso pero interesante.",
          isFake: true,
          explanation: "Porque es un ejemplo.",
          reference: "Wikipedia"
        }
      ]
    };
  } else if (templateType === "crossword") {
    return {
      words: [
        { word: "CEREBRO", clue: "Órgano principal" },
        { word: "MENTE", clue: "Lo que estudiamos" }
      ]
    };
  } else if (templateType === "memory") {
    return {
      pairs: [
        { id: "1", content1: "A", content2: "A" },
        { id: "2", content1: "B", content2: "B" },
        { id: "3", content1: "C", content2: "C" },
        { id: "4", content1: "D", content2: "D" }
      ]
    };
  } else if (templateType === "snakes_ladders") {
    return {
      board_width: 5,
      board_height: 5,
      start_position: 1,
      end_position: 25,
      snakes: [{ start: 14, end: 4 }],
      ladders: [{ start: 3, end: 12 }],
      ai_config: { difficulty: "EASY" }
    };
  }
}

let sql = '';

for (const sec of sections) {
  const sectionId = uuid();
  sql += `INSERT INTO sections (id, title, color, is_published) VALUES ('${sectionId}', '${sec.title}', '${sec.color}', TRUE);\n`;
  
  for (const type of templateTypes) {
    const levelId = uuid();
    const content = JSON.stringify(generateContent(type, sec.title));
    const title = `Nivel de ${type} - ${sec.title}`;
    
    sql += `INSERT INTO levels (id, section_id, title, color, template_type, content, difficulty, is_published) VALUES ('${levelId}', '${sectionId}', '${title}', '${sec.color}', '${type}', '${content.replace(/'/g, "''")}', 5, TRUE);\n`;
  }
}

fs.writeFileSync('/mnt/wolf/codigo/usbi/backend/seed_games.sql', sql);
console.log("SQL generated at seed_games.sql");
