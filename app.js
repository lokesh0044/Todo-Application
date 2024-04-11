const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const isValid = require("date-fns/isValid");
const format = require("date-fns/format");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("server running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error : ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

function checkValidQueryParameters(request, response, next) {
  const { search_q, priority, status, category, date } = request.query;

  if (priority !== undefined) {
    const priorityValues = ["HIGH", "MEDIUM", "LOW"];
    if (!priorityValues.includes(priority)) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    } else {
      request.priority = priority;
    }
  }

  if (status !== undefined) {
    const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
    if (!statusValues.includes(status)) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    } else {
      request.status = status;
    }
  }

  if (category !== undefined) {
    const categoryValues = ["WORK", "HOME", "LEARNING"];
    if (!categoryValues.includes(category)) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    } else {
      request.category = category;
    }
  }

  if (date !== undefined) {
    const valid = isValid(new Date(date));
    if (valid) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    } else {
      const formattedDate = format(new Date(date), "yyyy-MM-dd");
      request.date = formattedDate;
    }
  }

  request.search_q = search_q;
  next();
}

function checkValidDate(request, response, next) {
  const { date } = request.query;
  if (date !== undefined) {
    const valid = isValid(new Date(date));
    if (valid) {
      const formattedDate = format(new Date(date), "yyyy-MM-dd");
      request.date = formattedDate;
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
}

function checkValidInputData(request, response, next) {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const { todoId } = request.params;
  request.id = id;
  request.todo = todo;
  request.todoId = todoId;

  if (priority !== undefined) {
    const priorityValues = ["HIGH", "MEDIUM", "LOW"];
    if (!priorityValues.includes(priority)) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    } else {
      request.priority = priority;
    }
  }

  if (status !== undefined) {
    const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
    if (!statusValues.includes(status)) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    } else {
      request.status = status;
    }
  }

  if (category !== undefined) {
    const categoryValues = ["WORK", "HOME", "LEARNING"];
    if (!categoryValues.includes(category)) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    } else {
      request.category = category;
    }
  }

  if (dueDate !== undefined) {
    const valid = isValid(new Date(dueDate));
    if (!valid) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    } else {
      const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
      request.dueDate = formattedDate;
    }
  }

  next();
}

app.get("/todos/", checkValidQueryParameters, async (request, response) => {
  const { status = "", priority = "", category = "", search_q = "" } = request;
  const getTodosQuery = `
        SELECT 
            id,
            todo,
            priority,
            status,
            category,
            due_date AS dueDate
        FROM
            todo
        WHERE
            todo LIKE '%${search_q}%' AND priority LIKE '%${priority}%' 
            AND category LIKE '%${category}%' AND status LIKE '%${status}%';`;
  const todosArray = await database.all(getTodosQuery);
  response.send(todosArray);
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
        SELECT
            id,
            todo,
            priority,
            status,
            category,
            due_date AS dueDate
        FROM
            todo
        WHERE
            id = ${todoId};`;
  const todoArray = await database.get(getTodoQuery);
  response.send(todoArray);
});

app.get("/agenda/", checkValidDate, async (request, response) => {
  const { date } = request;
  const getAgendaQuery = `
        SELECT
            id,
            todo,
            priority,
            status,
            category,
            due_date AS dueDate
        FROM
            todo
        WHERE
            due_date = '${date}';`;
  const agendaArray = await database.all(getAgendaQuery);
  response.send(agendaArray);
});

app.post("/todos/", checkValidInputData, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request;
  const postTodoQuery = `
  INSERT INTO 
    todo (id, todo, category, priority, status, due_date)
  VALUES 
    (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;
  await database.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", checkValidInputData, async (request, response) => {
  const { todoId } = request;
  let updateColumn = "";
  const requestBody = request;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `
        SELECT 
            * 
        FROM 
            todo 
        WHERE 
            id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);
  const {
    todo = previousTodo.todo,
    status = previousTodo.status,
    priority = previousTodo.priority,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request;
  const updateTodoQuery = `
        UPDATE 
            todo 
        SET 
            todo = '${todo}', 
            status = '${status}', 
            priority = '${priority}', 
            category = '${category}', 
            due_date = '${dueDate}' 
        WHERE 
            id = ${todoId} ;`;
  await database.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId};`;
  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
