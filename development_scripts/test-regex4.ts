const title = "3 ChatGPT tricks, 349 thousand views - play Short";
const regex = /,\s*[\d\\.,]+\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones).*$/i;
console.log(title.match(regex));
console.log("Without comma:", title.replace(/,\s*[\d\.,]+\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones).*$/i, '').replace(/\s*-\s*play Short/i, '').trim());
