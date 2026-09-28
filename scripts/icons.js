import { writeFileSync } from "node:fs";

const MAP = {
  JavaScript: "javascript/javascript-plain",
  HTML: "html5/html5-plain",
  CSS: "css3/css3-plain",
  TypeScript: "typescript/typescript-plain",
  Shell: "bash/bash-plain",
  Dockerfile: "docker/docker-plain",
  Java: "java/java-plain",
  Python: "python/python-plain",
  Go: "go/go-plain",
  "Go Template": "go/go-plain",
  Ruby: "ruby/ruby-plain",
  Perl: "perl/perl-plain",
  Clojure: "clojure/clojure-line",
  HCL: "terraform/terraform-plain",
  PowerShell: "powershell/powershell-plain",
  "C++": "cplusplus/cplusplus-plain",
  C: "c/c-line",
  PLpgSQL: "postgresql/postgresql-plain",
  Vue: "vuejs/vuejs-plain",
  SCSS: "sass/sass-original",
  Gherkin: "cucumber/cucumber-plain",
  UnrealScript: "unrealengine/unrealengine-original",
  Batchfile: "windows8/windows8-original",
  Procfile: "heroku/heroku-plain",
  Starlark: "bazel/bazel-plain",
};

const icons = {};
for (const [name, path] of Object.entries(MAP)) {
  const svg = await (
    await fetch(`https://cdn.jsdelivr.net/npm/devicon@2/icons/${path}.svg`)
  ).text();
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
  const body = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<(style|title|defs)[\s\S]*?<\/\1>/g, "")
    .replace(/\s(fill|style|class|stroke)="[^"]*"/g, "")
    .replace(/\s+/g, " ")
    .trim();
  icons[name] = { viewBox, body };
}
writeFileSync(
  new URL("../icons.js", import.meta.url),
  `export const ICONS = ${JSON.stringify(icons)};\n`,
);
console.log(`icons.js: ${Object.keys(icons).length} icons`);
