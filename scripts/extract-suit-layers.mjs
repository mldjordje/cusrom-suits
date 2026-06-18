import fs from "fs";
const s = fs.readFileSync("app/custom-suits/data/options.ts", "utf8");
const styles = ["single_1btn", "double_6btn", "single_2btn", "double_4btn"];
const out = [];
for (const id of styles) {
  const i = s.indexOf(`id: "${id}"`);
  if (i < 0) { console.log(id, "NOT FOUND"); continue; }
  const ends = ["lapels:", "interiors:", "pockets:"].map((t) => { const j = s.indexOf(t, i); return j < 0 ? 1e9 : j; });
  const seg = s.slice(i, Math.min(...ends));
  const layer = (l) => {
    const m = seg.match(new RegExp(`id:\\s*"${l}"[\\s\\S]{0,160}?src:\\s*"([^"]+)"`));
    return m ? m[1].split("/").pop() : "-";
  };
  out.push({ id, torso: layer("torso"), sleeves: layer("sleeves"), bottom: layer("bottom"), pants: layer("pants") });
}
out.forEach((o) => console.log(JSON.stringify(o)));
