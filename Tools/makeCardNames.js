const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "oracle-cards.json");
const outputPath = path.join(__dirname, "..", "data", "cardNames.json");

if (!fs.existsSync(inputPath)) {
  console.error("ERROR: Could not find oracle-cards.json in the tools folder.");
  console.error("Expected location:", inputPath);
  process.exit(1);
}

console.log("Reading Oracle cards file...");

const cards = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const cardNames = Array.from(
  new Set(
    cards
      .map((card) => card.name)
      .filter(Boolean)
  )
)
  .sort((a, b) => a.localeCompare(b))
  .map((name) => ({ name }));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(cardNames, null, 2));

console.log(`Created data/cardNames.json with ${cardNames.length} card names.`);
