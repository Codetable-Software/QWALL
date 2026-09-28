import fs from "node:fs";
import readline from "node:readline";

const MODEL_PATH = new URL("./models.json", import.meta.url);

let model;

try {
  model = JSON.parse(
    fs.readFileSync(MODEL_PATH, "utf8")
  );
} catch (error) {
  console.error("QWALL: Failed to load models.json");
  console.error(error.message);
  process.exit(1);
}

if (
  !model ||
  typeof model !== "object" ||
  !model.expression ||
  typeof model.expression !== "object"
) {
  console.error("QWALL: Invalid models.json");
  process.exit(1);
}

const expressions = model.expression;

function parseExpression(input) {
  let expression = input;

  for (const [symbol, operator] of Object.entries(expressions)) {
    expression = expression.split(symbol).join(operator);
  }

  return expression;
}

function evaluate(input) {
  const expression = parseExpression(input);

  // Hanya izinkan karakter matematika yang diperlukan.
  if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
    throw new Error("Invalid expression");
  }

  return Function(
    `"use strict"; return (${expression})`
  )();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "qwall> "
});

console.log("QWALL 1");
console.log("Model: models.json");
console.log('Type "exit" to quit.');
console.log();

rl.prompt();

rl.on("line", (input) => {
  const command = input.trim();

  if (!command) {
    rl.prompt();
    return;
  }

  if (command === "exit") {
    rl.close();
    return;
  }

  try {
    const result = evaluate(command);
    console.log(result);
  } catch (error) {
    console.log(`QWALL: ${error.message}`);
  }

  rl.prompt();
});

rl.on("close", () => {
  console.log("QWALL terminated.");
});
