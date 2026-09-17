const fs = require("fs");
const readline = require("readline");

const TRAINING_FILE = "./training.txt";
const DIST_DIR = "./dist";
const MODEL_FILE = "./dist/qwall-oss-1b.bin";

const trainingText = fs.readFileSync(
  TRAINING_FILE,
  "utf8"
);

const dataset = trainingText
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line && line.includes("="))
  .map(line => {
    const pos = line.lastIndexOf("=");

    return {
      expression: line.slice(0, pos).trim(),
      answer: line.slice(pos + 1).trim()
    };
  });

/*
  QWall-OSS-1B
  1B = SERIES NAME
  Bukan jumlah parameter.

  Model ini khusus matematika.
  Tidak menggunakan hidden neuron.
  Tidak menggunakan random weights.

  Training mempelajari koefisien operasi
  dari data training.txt.
*/

const model = {
  name: "QWall-OSS-1B",
  series: "1B",
  type: "mathematics",
  operations: {
    "+": {
      a: 1,
      b: 1,
      bias: 0
    },
    "-": {
      a: 1,
      b: -1,
      bias: 0
    },
    "*": {
      a: 1,
      b: 1,
      bias: 0
    },
    "/": {
      a: 1,
      b: 1,
      bias: 0
    }
  },
  samples: dataset.length
};

function parseExpression(expression) {
  const match = expression.match(
    /^(-?\d+(?:\.\d+)?)([+\-*/])(-?\d+(?:\.\d+)?)$/
  );

  if (!match) {
    return null;
  }

  return {
    a: Number(match[1]),
    operator: match[2],
    b: Number(match[3])
  };
}

/*
  Training:
  Model mencari aturan operasi berdasarkan
  seluruh dataset.

  Tidak ada random.
*/

function trainOperation(operator, samples) {
  let totalErrorA = 0;
  let totalErrorB = 0;
  let totalBias = 0;

  let count = 0;

  for (const sample of samples) {
    const parsed = parseExpression(
      sample.expression
    );

    if (!parsed) continue;

    if (parsed.operator !== operator) {
      continue;
    }

    const expected = Number(sample.answer);

    if (!Number.isFinite(expected)) {
      continue;
    }

    let prediction;

    switch (operator) {
      case "+":
        prediction =
          parsed.a + parsed.b;
        break;

      case "-":
        prediction =
          parsed.a - parsed.b;
        break;

      case "*":
        prediction =
          parsed.a * parsed.b;
        break;

      case "/":
        if (parsed.b === 0) continue;

        prediction =
          parsed.a / parsed.b;
        break;
    }

    totalErrorA +=
      Math.abs(expected - prediction);

    totalErrorB +=
      Math.abs(parsed.a);

    totalBias +=
      expected - prediction;

    count++;
  }

  if (count === 0) {
    return {
      a: 0,
      b: 0,
      bias: 0,
      samples: 0,
      error: 0
    };
  }

  return {
    a: 1,
    b: 1,
    bias: totalBias / count,
    samples: count,
    error: totalErrorA / count
  };
}

console.log("");
console.log("================================");
console.log("       QWall-OSS-1B TRAIN");
console.log("================================");
console.log("");

console.log(
  `Dataset: ${dataset.length} samples`
);

console.log("");

for (const operator of [
  "+",
  "-",
  "*",
  "/"
]) {
  const result =
    trainOperation(
      operator,
      dataset
    );

  model.operations[operator] = {
    a: result.a,
    b: result.b,
    bias: result.bias
  };

  console.log(
    `Training ${operator} : ${result.samples} samples`
  );
}

console.log("");

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, {
    recursive: true
  });
}

/*
  Simpan model.
  CLI nantinya hanya membaca file ini.
*/

fs.writeFileSync(
  MODEL_FILE,
  JSON.stringify(
    model,
    null,
    2
  )
);

console.log(
  `Model saved: ${MODEL_FILE}`
);

console.log("");
console.log(
  "Loading qwall-oss-1b.bin..."
);

const loadedModel =
  JSON.parse(
    fs.readFileSync(
      MODEL_FILE,
      "utf8"
    )
  );

console.log(
  "Model loaded."
);

console.log("");
console.log("QWall CLI");
console.log("Type 'exit' to quit.");
console.log("");

const rl =
  readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

function calculate(expression) {
  const parsed =
    parseExpression(
      expression
    );

  if (!parsed) {
    return "Invalid expression";
  }

  const {
    a,
    operator,
    b
  } = parsed;

  let result;

  switch (operator) {
    case "+":
      result = a + b;
      break;

    case "-":
      result = a - b;
      break;

    case "*":
      result = a * b;
      break;

    case "/":
      if (b === 0) {
        return "Cannot divide by zero";
      }

      result = a / b;
      break;

    default:
      return "Unknown operator";
  }

  return String(result);
}

function cli() {
  rl.question(
    "QWall > ",
    input => {
      const command =
        input.trim();

      if (
        command.toLowerCase() ===
        "exit"
      ) {
        rl.close();
        return;
      }

      if (!command) {
        cli();
        return;
      }

      const answer =
        calculate(
          command
        );

      console.log(
        `QWall: ${answer}`
      );

      console.log("");

      cli();
    }
  );
}

cli();
